"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { readActivity, type ActivityRecord } from "@/lib/activity";
import { decodeJson, readContract, writeAndVerify, type WriteResult } from "@/lib/genlayer";
import { formatDate, sha256, shortAddress, shortHash, stableStringify } from "@/lib/format";
import { NETWORK } from "@/lib/network";
import { reconcileActivity } from "@/lib/recovery";
import { connectedProviderAccount, connectProvider, discoverWallets, providerChainId, switchToStudionet, type WalletOption } from "@/lib/wallet";
import { normalizeEvidencePath, normalizeRepo, validateProgram, validateSnapshot } from "@/lib/validation";
import { readConsistentPage } from "@/lib/pagination";
import type { Criterion, Entry, Program, ReviewAttempt, Revision, WalletState } from "@/lib/types";

type PageKey = "explorer" | "program" | "publish" | "apply" | "evidence" | "workspace" | "activity";
type LoadState = "loading" | "ready" | "empty" | "unconfigured" | "error";

const navigation: Array<{ label: string; href: string; page: PageKey }> = [
  { label: "Explore", href: "/", page: "explorer" },
  { label: "Publish", href: "/publish", page: "publish" },
  { label: "Workspace", href: "/workspace", page: "workspace" },
  { label: "Activity", href: "/activity", page: "activity" },
];
const WALLET_OPTION_STORAGE_KEY = "entrew.wallet-option";

function asNumber(value: unknown): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("The contract returned an invalid count.");
  return result;
}

async function readCount(method: string, args: unknown[] = []): Promise<number> {
  return asNumber(await readContract<unknown>(method, args));
}

async function readRows<T>(method: string, args: unknown[]): Promise<T[]> {
  return decodeJson<T[]>(await readContract<unknown>(method, args));
}

function userFacingReadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/has not been deployed/i.test(message)) return "The public registry contract address is not configured yet.";
  return "Could not load this record from the finalized Studionet registry. Check the connection and retry.";
}

function outcomeClass(value: string): string {
  if (value === "QUALIFIED" || value === "MET") return "success";
  if (value === "NOT_ESTABLISHED" || value === "NOT_MET") return "failure";
  if (value === "INCONCLUSIVE" || value === "UNVERIFIABLE") return "unresolved";
  return "warning";
}

function OutcomeTag({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  return <span className={`tag ${outcomeClass(value)}`}>{label}</span>;
}

function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  return <div className="criteria-list">{criteria.map((criterion, index) => (
    <article className="criterion-card" key={criterion.key}>
      <div className="criterion-number"><span>0{index + 1}</span><span>·</span><span>{criterion.type}</span></div>
      <p>{criterion.requirement}</p>
      <div className="expect">Evidence expected: {criterion.evidence_expectations}</div>
    </article>
  ))}</div>;
}

function EmptyState({ title, detail, action, headingLevel = 3 }: { title: string; detail: string; action?: ReactNode; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">⌁</div><Heading>{title}</Heading><p>{detail}</p>{action}</div>;
}

function ProgramCards({ programs, nowSeconds, emptyTitle = "No published programs yet" }: { programs: Program[]; nowSeconds: number | null; emptyTitle?: string }) {
  if (!programs.length) return <EmptyState title={emptyTitle} detail="Programs appear here after an organizer publishes them to the configured Studionet registry." />;
  return <div className="program-grid">{programs.map((program) => {
    const isOpen = nowSeconds !== null && program.deadline > nowSeconds;
    return <Link className="program-card" key={program.program_id} href={`/program?ref=${encodeURIComponent(program.program_id)}`}>
      <div className="card-meta"><span>{program.program_id.toUpperCase()}</span><span className={`tag ${nowSeconds === null ? "" : isOpen ? "success" : "warning"}`}>{nowSeconds === null ? "Checking deadline" : isOpen ? "Open" : "Closed"}</span></div>
      <h3>{program.title}</h3>
      <p className="summary">{program.summary || program.description}</p>
      <div className="criteria-mini">{program.criteria.map((criterion, index) => <span key={criterion.key}>C{index + 1} {criterion.type.toLowerCase()}</span>)}</div>
      <div className="card-footer"><span>{program.criteria.length} mandatory criteria</span><span>Closes <strong>{formatDate(program.deadline).split(",")[0]}</strong></span></div>
    </Link>;
  })}</div>;
}

function EvidenceAtlasArt() {
  return <div className="hero-art" aria-hidden="true"><div className="atlas-card">
    <div className="atlas-top"><span className="tag">Evidence atlas</span><span className="hash">REVIEW FLOW</span></div>
    <div className="atlas-lines">
      <div className="atlas-row"><span className="atlas-check">01</span><span>Published criteria</span></div>
      <div className="atlas-row"><span className="atlas-check">02</span><span>Exact public revision</span></div>
      <div className="atlas-row"><span className="atlas-check">03</span><span>Independent validator review</span></div>
    </div>
    <div className="atlas-foot"><span>Application state</span><strong>Read from contract</strong></div>
  </div></div>;
}

export default function EntrewApp({ page }: { page: PageKey }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [walletModal, setWalletModal] = useState(false);
  const walletModalRef = useRef<HTMLElement | null>(null);
  const modalReturnFocus = useRef<HTMLElement | null>(null);
  const [walletError, setWalletError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const writeLock = useRef(false);
  const connectionVersion = useRef(0);
  const loadVersion = useRef(0);
  const [query, setQuery] = useState<URLSearchParams | null>(null);
  const [explorerOffset, setExplorerOffset] = useState(0);
  const [programApplicantOffset, setProgramApplicantOffset] = useState(0);
  const [programQualifiedOffset, setProgramQualifiedOffset] = useState(0);
  const [workspaceApplicationOffset, setWorkspaceApplicationOffset] = useState(0);
  const [workspacePublicationOffset, setWorkspacePublicationOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(page === "activity" ? "ready" : "loading");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [busy, setBusy] = useState(false);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programCount, setProgramCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [program, setProgram] = useState<Program | null>(null);
  const [programEntries, setProgramEntries] = useState<Entry[]>([]);
  const [qualifiedEntries, setQualifiedEntries] = useState<Entry[]>([]);
  const [entryCount, setEntryCount] = useState(0);
  const [qualifiedCount, setQualifiedCount] = useState(0);
  const [programTab, setProgramTab] = useState<"qualified" | "applicants">("qualified");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [attempts, setAttempts] = useState<ReviewAttempt[]>([]);
  const [walletPrograms, setWalletPrograms] = useState<Program[]>([]);
  const [walletEntries, setWalletEntries] = useState<Entry[]>([]);
  const [walletProgramCount, setWalletProgramCount] = useState(0);
  const [walletEntryCount, setWalletEntryCount] = useState(0);
  const [workspaceTab, setWorkspaceTab] = useState<"applications" | "publications">("applications");
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [activityResults, setActivityResults] = useState<Record<string, { label: string; detail: string }>>({});
  const [recoveringHash, setRecoveringHash] = useState("");
  const [createdLink, setCreatedLink] = useState("");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([
    { key: "implementation", type: "IMPLEMENTATION", requirement: "", evidence_expectations: "" },
    { key: "documentation", type: "DOCUMENTATION", requirement: "", evidence_expectations: "" },
  ]);
  const [deadlineInput, setDeadlineInput] = useState("");

  const [ownerInput, setOwnerInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [shaInput, setShaInput] = useState("");
  const [pathsInput, setPathsInput] = useState("");
  const [evidenceMapping, setEvidenceMapping] = useState<Record<string, string[]>>({});
  const [claimNonce, setClaimNonce] = useState("");

  const programId = page === "program" ? query?.get("ref") || "" : page === "apply" ? query?.get("program") || "" : "";
  const entryId = page === "evidence" ? query?.get("entry") || "" : "";

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search));
  }, [page]);

  useEffect(() => {
    const refreshClock = () => {
      if (document.visibilityState === "visible") setNowSeconds(Math.floor(Date.now() / 1000));
    };
    refreshClock();
    const timer = window.setInterval(refreshClock, 1000);
    window.addEventListener("focus", refreshClock);
    document.addEventListener("visibilitychange", refreshClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshClock);
      document.removeEventListener("visibilitychange", refreshClock);
    };
  }, []);

  useEffect(() => {
    setActivityRecords(readActivity());
  }, [page, reload]);

  useEffect(() => {
    if (!wallet) return;
    const provider = wallet.provider;
    const accountChanged = (accounts: unknown) => {
      connectionVersion.current += 1;
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        setWallet(null);
        window.sessionStorage.removeItem(WALLET_OPTION_STORAGE_KEY);
        setNotice("ENTREW disconnected from this tab. Wallet permission may remain enabled in the provider.");
        return;
      }
      setWallet((current) => current && ({ ...current, address: accounts[0] as `0x${string}` }));
      setNotice("Wallet account changed. Wallet-scoped views are refreshing from finalized chain reads.");
    };
    const chainChanged = (chain: unknown) => {
      connectionVersion.current += 1;
      const chainId = typeof chain === "string" ? Number.parseInt(chain, 16) : null;
      setWallet((current) => current && ({ ...current, chainId: Number.isFinite(chainId) ? chainId : null }));
    };
    const disconnected = () => {
      connectionVersion.current += 1;
      setWallet(null);
      window.sessionStorage.removeItem(WALLET_OPTION_STORAGE_KEY);
    };
    provider.on?.("accountsChanged", accountChanged);
    provider.on?.("chainChanged", chainChanged);
    provider.on?.("disconnect", disconnected);
    return () => {
      provider.removeListener?.("accountsChanged", accountChanged);
      provider.removeListener?.("chainChanged", chainChanged);
      provider.removeListener?.("disconnect", disconnected);
    };
  }, [wallet, wallet?.provider]);

  useEffect(() => {
    const preferredOptionId = window.sessionStorage.getItem(WALLET_OPTION_STORAGE_KEY);
    if (!preferredOptionId) return;
    const version = ++connectionVersion.current;
    let cancelled = false;
    void (async () => {
      try {
        const option = (await discoverWallets()).find((candidate) => candidate.id === preferredOptionId);
        if (!option) throw new Error("The previously selected wallet is unavailable.");
        const [address, chainId] = await Promise.all([connectedProviderAccount(option.provider), providerChainId(option.provider)]);
        if (!address) throw new Error("The previously selected wallet has no available account.");
        if (!cancelled && connectionVersion.current === version) setWallet({ address, provider: option.provider, name: option.name, chainId });
      } catch {
        window.sessionStorage.removeItem(WALLET_OPTION_STORAGE_KEY);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const version = ++loadVersion.current;
    let cancelled = false;
    const current = () => !cancelled && loadVersion.current === version;
    if (page === "explorer") { setPrograms([]); setProgramCount(0); }
    if (page === "program" || page === "apply") setProgram(null);
    if (page === "program") { setProgramEntries([]); setQualifiedEntries([]); setEntryCount(0); setQualifiedCount(0); }
    if (page === "evidence") { setEntry(null); setRevision(null); setRevisions([]); setAttempts([]); }
    if (page === "workspace") { setWalletPrograms([]); setWalletEntries([]); setWalletProgramCount(0); setWalletEntryCount(0); }
    const run = async () => {
      setLoadError("");
      if (page === "activity") { setLoadState("ready"); return; }
      if ((page === "program" || page === "apply" || page === "evidence") && !query) {
        setLoadState("loading");
        return;
      }
      setLoadState("loading");
      try {
        if (page === "explorer") {
          const result = await readConsistentPage(
            () => readCount("get_program_count"),
            (start, limit) => readRows<Program>("get_programs_page", [start, limit]),
            explorerOffset,
          );
          if (!current()) return;
          setProgramCount(result.count); setPrograms(result.rows); setLoadState(result.count ? "ready" : "empty");
          return;
        }
        if (page === "program" || page === "apply") {
          if (!programId) throw new Error(page === "program" ? "This link needs a program reference." : "This link needs a program reference to start an application.");
          const loaded = decodeJson<Program>(await readContract("get_program", [programId]));
          if (!current()) return;
          setProgram(loaded);
          if (page === "program") {
            const [applicants, qualified] = await Promise.all([
              readConsistentPage(
                () => readCount("get_program_entry_count", [programId]),
                (start, limit) => readRows<Entry>("get_program_entries_page", [programId, start, limit]),
                programApplicantOffset,
              ),
              readConsistentPage(
                () => readCount("get_program_qualified_count", [programId]),
                (start, limit) => readRows<Entry>("get_program_qualified_page", [programId, start, limit]),
                programQualifiedOffset,
              ),
            ]);
            if (!current()) return;
            setEntryCount(applicants.count); setQualifiedCount(qualified.count);
            setProgramEntries(applicants.rows); setQualifiedEntries(qualified.rows);
          }
          setLoadState("ready");
          return;
        }
        if (page === "evidence") {
          if (!entryId) throw new Error("This link needs an entry reference.");
          const loaded = decodeJson<Entry>(await readContract("get_entry", [entryId]));
          const [programRecord, revisionPage, revisionCount] = await Promise.all([
            decodeJson<Program>(await readContract("get_program", [loaded.program_id])),
            readRows<Revision>("get_entry_revisions_page", [entryId, 0, 25]),
            readCount("get_entry_revision_count", [entryId]),
          ]);
          if (!current()) return;
          const selectedRevision = revisionPage.find((item) => item.revision_id === loaded.current_revision) || null;
          const attemptRows: ReviewAttempt[] = [];
          for (const item of revisionPage.slice(0, Math.min(revisionCount, 4))) {
            const attemptCount = await readCount("get_revision_attempt_count", [item.revision_id]);
            if (attemptCount) attemptRows.push(...await readRows<ReviewAttempt>("get_revision_attempts_page", [item.revision_id, 0, 25]));
          }
          if (!current()) return;
          setProgram(programRecord); setEntry(loaded); setRevision(selectedRevision); setRevisions(revisionPage); setAttempts(attemptRows);
          setLoadState("ready");
          return;
        }
        if (page === "workspace") {
          if (!wallet) { setLoadState("ready"); return; }
          const [publications, applications] = await Promise.all([
            readConsistentPage(
              () => readCount("get_wallet_program_count", [wallet.address]),
              (start, limit) => readRows<Program>("get_wallet_programs_page", [wallet.address, start, limit]),
              workspacePublicationOffset,
            ),
            readConsistentPage(
              () => readCount("get_wallet_entry_count", [wallet.address]),
              (start, limit) => readRows<Entry>("get_wallet_entries_page", [wallet.address, start, limit]),
              workspaceApplicationOffset,
            ),
          ]);
          if (!current()) return;
          setWalletProgramCount(publications.count); setWalletEntryCount(applications.count);
          setWalletPrograms(publications.rows); setWalletEntries(applications.rows); setLoadState("ready");
          return;
        }
        if (page === "publish") { setLoadState("ready"); return; }
      } catch (error) {
        if (!current()) return;
        const rawMessage = error instanceof Error ? error.message : "";
        if (rawMessage.includes("has not been deployed")) setLoadState("unconfigured");
        else { setLoadError(userFacingReadError(error)); setLoadState("error"); }
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [page, explorerOffset, programApplicantOffset, programQualifiedOffset, workspaceApplicationOffset, workspacePublicationOffset, reload, query, programId, entryId, wallet]);

  const filteredPrograms = useMemo(() => programs.filter((item) => {
    const text = `${item.title} ${item.summary} ${item.description}`.toLowerCase();
    const matchesText = !search.trim() || text.includes(search.trim().toLowerCase());
    const open = nowSeconds !== null && item.deadline > nowSeconds;
    const matchesStatus = statusFilter === "all" || (statusFilter === "open" ? open : nowSeconds !== null && !open);
    return matchesText && matchesStatus;
  }), [programs, search, statusFilter, nowSeconds]);

  function closeWalletModal() {
    setWalletModal(false);
    const target = modalReturnFocus.current;
    if (target?.isConnected) window.requestAnimationFrame(() => target.focus());
  }

  useEffect(() => {
    if (!walletModal) return;
    const modal = walletModalRef.current;
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => modal ? Array.from(modal.querySelectorAll<HTMLElement>(selector)) : [];
    const items = focusable();
    (items[0] || modal)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWalletModal();
        return;
      }
      if (event.key !== "Tab") return;
      const currentItems = focusable();
      if (!currentItems.length) {
        event.preventDefault();
        modal?.focus();
        return;
      }
      const first = currentItems[0];
      const last = currentItems[currentItems.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [walletModal]);

  async function chooseWallet(option: WalletOption) {
    const version = ++connectionVersion.current;
    setConnecting(true); setWalletError("");
    try {
      const address = await connectProvider(option.provider);
      const chainId = await providerChainId(option.provider);
      if (connectionVersion.current !== version) return;
      setWallet({ address, provider: option.provider, name: option.name, chainId });
      window.sessionStorage.setItem(WALLET_OPTION_STORAGE_KEY, option.id);
      setWalletModal(false); setWalletOptions([]);
      window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".header-actions .connect")?.focus());
      setNotice(chainId === NETWORK.id ? "Connected to Studionet. Public reads remain on the configured finalized RPC." : "Wallet connected on another network. Switch to Studionet before signing.");
    } catch (error) {
      if (connectionVersion.current === version) setWalletError(error instanceof Error ? error.message : "Wallet connection was rejected.");
    } finally {
      if (connectionVersion.current === version) setConnecting(false);
    }
  }

  async function openWalletPicker() {
    setWalletError("");
    try {
      const options = await discoverWallets();
      if (!options.length) { setWalletError("No injected wallet was found. Install MetaMask or Rabby to sign writes; public browsing does not need a wallet."); return; }
      if (options.length === 1) await chooseWallet(options[0]);
      else { modalReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setWalletOptions(options); setWalletModal(true); }
    } catch (error) { setWalletError(error instanceof Error ? error.message : "Could not inspect injected wallets."); }
  }

  async function switchWalletNetwork() {
    if (!wallet) return;
    try {
      await switchToStudionet(wallet.provider);
      const [chainId, accounts] = await Promise.all([
        providerChainId(wallet.provider),
        wallet.provider.request({ method: "eth_accounts" }),
      ]);
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error("The wallet no longer has an available account.");
      setWallet((current) => current?.provider === wallet.provider ? { ...current, address: accounts[0] as `0x${string}`, chainId } : current);
      setNotice("Wallet switched to GenLayer Studionet (61999).");
    } catch (error) { setWalletError(error instanceof Error ? error.message : "The wallet could not switch networks."); }
  }

  function disconnectApp() {
    connectionVersion.current += 1;
    setWallet(null);
    window.sessionStorage.removeItem(WALLET_OPTION_STORAGE_KEY);
    setNotice("Disconnected from ENTREW in this tab. The wallet provider may still have account permission.");
  }

  async function runWrite(args: {
    functionName: string; contractArgs: unknown[]; operation: string; itemIdentity: string; payloadDigest: string; canonicalReadback: () => Promise<boolean>;
  }) {
    if (writeLock.current) return null;
    if (!wallet) { setActionError("Connect a wallet to sign this transaction."); return null; }
    if (wallet.chainId !== NETWORK.id) { setActionError("Switch the selected wallet to Studionet before signing."); return null; }
    writeLock.current = true;
    setBusy(true); setActionError(""); setNotice(""); setWriteResult(null); setCreatedLink("");
    try {
      const result = await writeAndVerify({ ...args, provider: wallet.provider, signer: wallet.address });
      setWriteResult(result); setNotice(result.message);
      if (result.canonical) setReload((value) => value + 1);
      return result;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The wallet rejected or failed this action.");
      return null;
    } finally { writeLock.current = false; setBusy(false); }
  }

  async function submitProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const deadline = Math.floor(new Date(deadlineInput).getTime() / 1000);
      validateProgram(title, summary, description, criteria, deadline);
      if (!wallet) throw new Error("Connect an organizer wallet before publishing.");
      if (wallet.chainId !== NETWORK.id) throw new Error("Switch the wallet to Studionet before publishing.");
      const frozenCriteria = criteria.map((item) => ({ ...item, requirement: item.requirement.trim(), evidence_expectations: item.evidence_expectations.trim() }));
      const termsDigest = await sha256(stableStringify({ title: title.trim(), summary: summary.trim(), description: description.trim(), criteria: frozenCriteria, deadline }));
      const before = await readCount("get_wallet_program_count", [wallet.address]);
      await runWrite({
        functionName: "publish_program",
        contractArgs: [title.trim(), summary.trim(), description.trim(), stableStringify(frozenCriteria), deadline],
        operation: "publish_program",
        itemIdentity: JSON.stringify({ kind: "publish", offset: before }),
        payloadDigest: termsDigest,
        canonicalReadback: async () => {
          const rows = await readRows<Program>("get_wallet_programs_page", [wallet.address, before, 25]);
          const found = rows.find((row) => row.organizer.toLowerCase() === wallet.address.toLowerCase() && row.terms_digest === termsDigest);
          if (found) setCreatedLink(`/program?ref=${encodeURIComponent(found.program_id)}`);
          return Boolean(found);
        },
      });
    } catch (error) { setActionError(error instanceof Error ? error.message : "The program draft is invalid."); }
  }

  function addCriterion() {
    if (criteria.length >= 3) return;
    const key = criteria.length === 2 ? "integration" : `criterion-${criteria.length + 1}`;
    setCriteria((rows) => [...rows, { key, type: "INTEGRATION", requirement: "", evidence_expectations: "" }]);
  }

  function updateCriterion(index: number, field: keyof Criterion, value: string) {
    setCriteria((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  function generateNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    setClaimNonce([...bytes].map((value) => value.toString(16).padStart(2, "0")).join(""));
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!program) throw new Error("The program has not loaded from the finalized registry.");
      if (!wallet) throw new Error("Connect the applicant wallet before submitting.");
      if (wallet.chainId !== NETWORK.id) throw new Error("Switch the wallet to Studionet before submitting.");
      const repository = normalizeRepo(ownerInput, repoInput);
      const paths = pathsInput.split(/\r?\n/).map((path) => path.trim()).filter(Boolean).map(normalizeEvidencePath);
      const mappings: Record<string, string[]> = {};
      for (let index = 0; index < program.criteria.length; index += 1) mappings[String(index)] = evidenceMapping[String(index)] || [];
      validateSnapshot(shaInput, paths, mappings, program.criteria.length);
      if (!/^[0-9a-f]{32,64}$/.test(claimNonce)) throw new Error("Create a 32 to 64 character lowercase hex claim nonce.");
      const snapshot = { owner: repository.owner, repo: repository.repo, commit_sha: shaInput.toLowerCase(), evidence_paths: [...paths].sort(), evidence_mappings: Object.fromEntries(Object.entries(mappings).map(([index, files]) => [index, [...new Set(files)].sort()])) };
      const digest = await sha256(stableStringify(snapshot));
      const before = await readCount("get_wallet_entry_count", [wallet.address]);
      await runWrite({
        functionName: "submit_entry",
        contractArgs: [program.program_id, repository.owner, repository.repo, shaInput, stableStringify(paths), stableStringify(mappings), claimNonce],
        operation: "submit_entry",
        itemIdentity: JSON.stringify({ kind: "entry", programId: program.program_id, offset: before }),
        payloadDigest: digest,
        canonicalReadback: async () => {
          const rows = await readRows<Entry>("get_wallet_entries_page", [wallet.address, before, 25]);
          for (const candidate of rows) {
            if (candidate.program_id !== program.program_id || candidate.applicant.toLowerCase() !== wallet.address.toLowerCase()) continue;
            const revisions = await readRows<Revision>("get_entry_revisions_page", [candidate.entry_id, 0, 1]);
            if (revisions[0]?.snapshot_digest === digest) {
              setCreatedLink(`/evidence?entry=${encodeURIComponent(candidate.entry_id)}`);
              return true;
            }
          }
          return false;
        },
      });
    } catch (error) { setActionError(error instanceof Error ? error.message : "The evidence snapshot is invalid."); }
  }

  async function assessCurrentRevision() {
    try {
      if (!entry || !revision || !program || !wallet) throw new Error("Load the exact entry, current revision, and connected applicant first.");
      if (entry.applicant.toLowerCase() !== wallet.address.toLowerCase()) throw new Error("Only the applicant wallet can request this assessment.");
      const before = await readCount("get_revision_attempt_count", [revision.revision_id]);
      const qualifiedBefore = await readCount("get_program_qualified_count", [entry.program_id]);
      await runWrite({
        functionName: "evaluate_revision",
        contractArgs: [entry.entry_id, revision.revision_id],
        operation: "evaluate_revision",
        itemIdentity: JSON.stringify({ kind: "review", entryId: entry.entry_id, revisionId: revision.revision_id, offset: before, qualifiedOffset: qualifiedBefore }),
        payloadDigest: revision.snapshot_digest,
        canonicalReadback: async () => {
          const rows = await readRows<ReviewAttempt>("get_revision_attempts_page", [revision.revision_id, before, 25]);
          const found = rows.find((row) => row.entry_id === entry.entry_id && row.revision_id === revision.revision_id && row.snapshot_digest === revision.snapshot_digest && row.criteria.length === program.criteria.length);
          if (!found) return false;
          const latest = decodeJson<Entry>(await readContract("get_entry", [entry.entry_id]));
          if (latest.current_revision !== revision.revision_id || latest.current_result !== found.outcome) return false;
          if (found.outcome === "QUALIFIED") {
            const roster = await readRows<Entry>("get_program_qualified_page", [entry.program_id, qualifiedBefore, 25]);
            return roster.some((row) => row.entry_id === entry.entry_id && row.qualified);
          }
          return !latest.qualified;
        },
      });
    } catch (error) { setActionError(error instanceof Error ? error.message : "Assessment could not be submitted."); }
  }

  async function submitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!entry || !program || !wallet) throw new Error("Load an entry and connect its applicant wallet first.");
      if (entry.applicant.toLowerCase() !== wallet.address.toLowerCase()) throw new Error("Only the applicant wallet can submit a revision.");
      const paths = pathsInput.split(/\r?\n/).map((path) => path.trim()).filter(Boolean).map(normalizeEvidencePath);
      const mappings: Record<string, string[]> = {};
      for (let index = 0; index < program.criteria.length; index += 1) mappings[String(index)] = evidenceMapping[String(index)] || [];
      validateSnapshot(shaInput, paths, mappings, program.criteria.length);
      if (!/^[0-9a-f]{32,64}$/.test(claimNonce)) throw new Error("Create a 32 to 64 character lowercase hex claim nonce.");
      const snapshot = { owner: entry.owner.toLowerCase(), repo: entry.repo.toLowerCase(), commit_sha: shaInput.toLowerCase(), evidence_paths: [...paths].sort(), evidence_mappings: Object.fromEntries(Object.entries(mappings).map(([index, files]) => [index, [...new Set(files)].sort()])) };
      const digest = await sha256(stableStringify(snapshot));
      const before = await readCount("get_entry_revision_count", [entry.entry_id]);
      await runWrite({
        functionName: "submit_revision",
        contractArgs: [entry.entry_id, shaInput, stableStringify(paths), stableStringify(mappings), claimNonce],
        operation: "submit_revision",
        itemIdentity: JSON.stringify({ kind: "revision", entryId: entry.entry_id, offset: before }),
        payloadDigest: digest,
        canonicalReadback: async () => {
          const rows = await readRows<Revision>("get_entry_revisions_page", [entry.entry_id, before, 25]);
          const found = rows.some((row) => row.snapshot_digest === digest && row.applicant.toLowerCase() === wallet.address.toLowerCase());
          if (found) setNotice("Revision finalized and found in the immutable entry history. Request its assessment on this page.");
          return found;
        },
      });
    } catch (error) { setActionError(error instanceof Error ? error.message : "Revision could not be submitted."); }
  }

  async function recover(record: ActivityRecord) {
    setRecoveringHash(record.hash); setActionError("");
    try { const result = await reconcileActivity(record); setActivityResults((rows) => ({ ...rows, [record.hash]: result })); }
    catch (error) { setActivityResults((rows) => ({ ...rows, [record.hash]: { label: "Recovery check failed", detail: error instanceof Error ? error.message : "Could not reconcile this transaction." } })); }
    finally { setRecoveringHash(""); }
  }

  function setEvidencePaths(index: number, values: string[]) {
    setEvidenceMapping((current) => ({ ...current, [String(index)]: values }));
  }

  const nav = <nav className={`main-nav ${mobileMenu ? "open" : ""}`} aria-label="Main navigation">{navigation.map((item) => <Link key={item.page} href={item.href} aria-current={item.page === page ? "page" : undefined}>{item.label}</Link>)}</nav>;
  const wrongNetwork = Boolean(wallet && wallet.chainId !== NETWORK.id);
  function sharedFeedback() {
    return <>
      {walletError && <div className="error-message" role="alert">{walletError}</div>}
      {actionError && <div className="error-message" role="alert">{actionError}</div>}
      {loadState === "error" && loadError && <div className="error-message" role="alert">{loadError} <button className="button secondary" onClick={() => setReload((value) => value + 1)}>Retry read</button></div>}
      {notice && <div className={writeResult?.canonical ? "success-message" : "status-message"} role="status" aria-live="polite">{notice}</div>}
      {writeResult && <div className="panel" style={{ margin: "12px 0" }}>
        <div className="card-meta"><strong>{writeResult.phase.replaceAll("_", " ")}</strong><a className="hash" href={`${NETWORK.explorer}/tx/${writeResult.hash}`} target="_blank" rel="noreferrer">{shortHash(writeResult.hash)} ↗</a></div>
        <p className="helper" style={{ margin: "8px 0 0" }}>{writeResult.message}</p>
      </div>}
      {createdLink && <Link className="button secondary" href={createdLink}>Open finalized record →</Link>}
    </>;
  }

  function loadingMessage() {
    if (loadState === "loading") return <div className="status-message" role="status"><span className="spinner" aria-hidden="true" /> Loading finalized registry records…</div>;
    if (loadState === "unconfigured") return <div className="callout">The public registry contract address is not configured yet. No programs or counts are shown until a real Studionet deployment is integrated.</div>;
    return null;
  }

  function explorerPage() {
    return <>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-mark" />Evidence Atlas · developer programs</div>
          <h1>Find the programs<br />your work <span>qualifies for.</span></h1>
          <p className="lede">Explore fixed criteria, pin your work to an exact public revision, and follow an independent review from evidence to finalized record.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 23 }}><a className="button" href="#programs">Explore programs <span aria-hidden="true">↓</span></a><Link className="button secondary" href="/publish">Publish a program</Link></div>
        </div><EvidenceAtlasArt />
      </section>
      <div className="section-head" id="programs"><div><div className="eyebrow"><span className="eyebrow-mark" />Live registry</div><h2 style={{ marginTop: 9 }}>Programs on the atlas</h2></div><p>{loadState === "ready" || loadState === "empty" ? `${programCount} published in finalized contract state` : "Counts appear after a contract is configured"}</p></div>
      {sharedFeedback()}{loadingMessage()}
      {loadState === "ready" || loadState === "empty" ? <>
        <div className="search-row"><input className="control" aria-label="Search this page of programs" placeholder="Search programs on this page…" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="control" aria-label="Filter program deadline" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All deadlines</option><option value="open">Open</option><option value="closed">Closed</option></select><span className="helper" style={{ alignSelf: "center" }}>Filter applies to this 25-record page.</span></div>
        {filteredPrograms.length ? <ProgramCards programs={filteredPrograms} nowSeconds={nowSeconds} /> : programs.length ? <EmptyState title="No match on this page" detail="Try another phrase or move to a different page. Search is limited to this finalized page." /> : <EmptyState title="No published programs yet" detail="When an organizer publishes to the configured registry, it will appear here. ENTREW never inserts sample programs." action={<Link className="button secondary" href="/publish">Publish the first program</Link>} />}
        <div className="row-item" style={{ marginTop: 14 }}><span className="helper">Records {programCount ? explorerOffset + 1 : 0}–{Math.min(explorerOffset + programs.length, programCount)} of {programCount}</span><div style={{ display: "flex", gap: 8 }}><button className="button secondary" disabled={explorerOffset === 0 || busy} onClick={() => setExplorerOffset(Math.max(0, explorerOffset - 25))}>Previous</button><button className="button secondary" disabled={explorerOffset + 25 >= programCount || busy} onClick={() => setExplorerOffset(explorerOffset + 25)}>Next</button></div></div>
      </> : null}
      <section style={{ marginTop: 58 }}><div className="eyebrow"><span className="eyebrow-mark" />How independent review works</div><h2 style={{ marginTop: 10 }}>A clear path from rule to record.</h2><div className="explain-grid">
        <article className="explain-card"><div className="num">01</div><h3>Rubric, signed once</h3><p>Organizers publish two or three observable requirements with a fixed deadline. The published terms cannot be edited or graded by the organizer.</p></article>
        <article className="explain-card"><div className="num">02</div><h3>Revision, pinned</h3><p>Applicants bind a public GitHub repository, full commit SHA, bounded evidence paths, and a claim marker in that same revision.</p></article>
        <article className="explain-card"><div className="num">03</div><h3>Validators, independent</h3><p>GenLayer validators retrieve the pinned evidence and reproduce criterion decisions. Only finalized contract state can add a qualification.</p></article>
      </div><p className="helper" style={{ marginTop: 14 }}>A wallet signature proves control of that wallet for this action. It does not prove a person&apos;s identity or authorship.</p></section>
    </>;
  }

  function programPage() {
    if (loadState === "loading") return <div className="page narrow">{loadingMessage()}</div>;
    return <>
      <div className="eyebrow"><span className="eyebrow-mark" />Program profile · {program?.program_id || "reference missing"}</div>
      {sharedFeedback()}{loadingMessage()}
      {!program && <section className="panel"><h1 className="record-empty-title">Program unavailable</h1><p className="helper">This program could not be loaded from the finalized registry.</p></section>}
      {program && <>
        <section style={{ padding: "25px 0 14px" }}><div className="card-meta"><span className="tag">Published rubric · v{program.schema_version}</span><span className={`tag ${nowSeconds === null ? "" : program.deadline > nowSeconds ? "success" : "warning"}`}>{nowSeconds === null ? "Checking deadline" : program.deadline > nowSeconds ? "Open for revisions" : "Deadline passed"}</span></div>
          <h1 style={{ maxWidth: 900, fontSize: "clamp(36px,5vw,60px)" }}>{program.title}</h1><p className="lede">{program.summary}</p><p style={{ maxWidth: 840, color: "#68718a", lineHeight: 1.75 }}>{program.description}</p>
          <div className="stat-strip"><span className="stat-chip"><strong>{program.criteria.length}</strong> mandatory criteria</span><span className="stat-chip"><strong>{qualifiedCount}</strong> qualified on chain</span><span className="stat-chip">Deadline <strong>{formatDate(program.deadline)}</strong></span></div>
          <div className="callout blue">Terms digest <span className="hash">{program.terms_digest}</span> · The contract contains no organizer outcome control.</div>
        </section>
        <div className="split-layout" style={{ marginTop: 28 }}><section className="panel"><div className="panel-title"><div><div className="eyebrow">Frozen assessment</div><h2 style={{ marginTop: 7 }}>The criteria</h2></div></div><CriteriaList criteria={program.criteria} /><div className="callout" style={{ marginTop: 16 }}>Each requirement is reviewed against explicitly mapped files in one exact GitHub commit. A filename alone does not establish implementation.</div></section>
          <section className="panel"><div className="panel-title"><div><div className="eyebrow">Public records</div><h2 style={{ marginTop: 7 }}>{programTab === "qualified" ? "Qualification roster" : "Applicant history"}</h2><p>{programTab === "qualified" ? `${qualifiedCount} finalized qualified entries` : `${entryCount} entries on the public index`}</p></div></div>
            <div className="tabs" role="tablist" aria-label="Program records"><button className="tab" role="tab" aria-selected={programTab === "qualified"} onClick={() => setProgramTab("qualified")}>Qualified</button><button className="tab" role="tab" aria-selected={programTab === "applicants"} onClick={() => setProgramTab("applicants")}>Applicants</button></div>
            <div className="row-list" style={{ marginTop: 12 }}>{(programTab === "qualified" ? qualifiedEntries : programEntries).length ? (programTab === "qualified" ? qualifiedEntries : programEntries).map((candidate) => <Link className="row-item" key={candidate.entry_id} href={`/evidence?entry=${encodeURIComponent(candidate.entry_id)}`}><div><strong>{candidate.owner}/{candidate.repo}</strong><p>{candidate.entry_id} · wallet {shortAddress(candidate.applicant)}</p></div><OutcomeTag value={candidate.current_result} /></Link>) : <EmptyState title={programTab === "qualified" ? "No finalized qualification yet" : "No applications yet"} detail="This view uses the contract index. It will remain empty until an applicant&apos;s record is written." />}</div>
            <div className="row-item"><span className="helper">Records {programTab === "qualified" ? (qualifiedCount ? programQualifiedOffset + 1 : 0) : (entryCount ? programApplicantOffset + 1 : 0)}–{programTab === "qualified" ? Math.min(programQualifiedOffset + qualifiedEntries.length, qualifiedCount) : Math.min(programApplicantOffset + programEntries.length, entryCount)} of {programTab === "qualified" ? qualifiedCount : entryCount}</span><div style={{ display: "flex", gap: 7 }}><button className="button secondary" disabled={(programTab === "qualified" ? programQualifiedOffset : programApplicantOffset) === 0} onClick={() => programTab === "qualified" ? setProgramQualifiedOffset(Math.max(0, programQualifiedOffset - 25)) : setProgramApplicantOffset(Math.max(0, programApplicantOffset - 25))}>Previous</button><button className="button secondary" disabled={programTab === "qualified" ? programQualifiedOffset + 25 >= qualifiedCount : programApplicantOffset + 25 >= entryCount} onClick={() => programTab === "qualified" ? setProgramQualifiedOffset(programQualifiedOffset + 25) : setProgramApplicantOffset(programApplicantOffset + 25)}>Next</button></div></div>
          </section></div>
        <section className="panel" style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15 }}><div><h3 style={{ marginBottom: 5 }}>Have a revision that fits?</h3><p className="helper" style={{ margin: 0 }}>Prepare the public marker and pinned files before submitting.</p></div><Link className="button" href={`/apply?program=${encodeURIComponent(program.program_id)}`} aria-disabled={nowSeconds === null || program.deadline <= nowSeconds} onClick={(event) => { if (nowSeconds === null || program.deadline <= nowSeconds) event.preventDefault(); }}>{nowSeconds !== null && program.deadline > nowSeconds ? "Open Evidence Studio →" : nowSeconds === null ? "Checking deadline" : "Program closed"}</Link></section>
        <section style={{ marginTop: 25 }} className="helper">Organizer <span className="hash">{program.organizer}</span> · terms SHA-256 <span className="hash">{program.terms_digest}</span></section>
      </>}
    </>;
  }

  function publishPage() {
    const previewDeadline = deadlineInput ? Math.floor(new Date(deadlineInput).getTime() / 1000) : 0;
    return <div className="page narrow">
      <div className="eyebrow"><span className="eyebrow-mark" />Publish a program</div><h1 style={{ fontSize: "clamp(37px,5vw,58px)" }}>Set the rules<br />before the work.</h1><p className="lede">Publish an immutable rubric that every applicant can inspect before they submit a revision.</p>
      {sharedFeedback()}
      {!wallet && <div className="callout blue">Connect an organizer wallet to publish. Criteria stay local until the wallet signs the transaction.</div>}
      {wrongNetwork && <div className="callout red">Your wallet is connected to chain {wallet?.chainId}. Switch it to Studionet 61999 before publishing.</div>}
      <div className="stepper" aria-label="Three steps"><span className="step active"><b>1</b> Define</span><span className="step-line" /><span className="step"><b>2</b> Criteria</span><span className="step-line" /><span className="step"><b>3</b> Review</span></div>
      <form className="panel" onSubmit={submitProgram}>
        <div className="panel-title"><div><div className="eyebrow">Program terms</div><h2 style={{ marginTop: 7 }}>Start with the opportunity</h2></div><span className="tag">Immutable after signing</span></div>
        <div className="field"><label htmlFor="program-title">Program title</label><input id="program-title" className="control" minLength={12} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Open source data tools cohort" required /><small>12–100 characters</small></div>
        <div className="field"><label htmlFor="program-summary">Short summary</label><input id="program-summary" className="control" maxLength={360} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Who this cohort is for and what it explores" /><small>Up to 360 characters</small></div>
        <div className="field"><label htmlFor="program-description">Program description</label><textarea id="program-description" className="control" maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the cohort and what applicants should build…" required /><small>Up to 1,200 characters</small></div>
        <div className="panel-title" style={{ marginTop: 20 }}><div><div className="eyebrow">Frozen assessment</div><h2 style={{ marginTop: 7 }}>Two or three mandatory criteria</h2><p>Each requirement needs observable evidence and a clear distinction between what meets it and what remains uncertain.</p></div>{criteria.length < 3 && <button type="button" className="button secondary" onClick={addCriterion}>+ Add criterion</button>}</div>
        {criteria.map((criterion, index) => <div className="criterion-card" key={index} style={{ marginBottom: 13, background: "#fbfbfd" }}><div className="criterion-number">CRITERION 0{index + 1} · KEY {criterion.key}</div>
          <div className="form-grid"><div className="field"><label htmlFor={`criterion-type-${index}`}>Evidence type</label><select id={`criterion-type-${index}`} className="control" value={criterion.type} onChange={(event) => updateCriterion(index, "type", event.target.value)}><option value="IMPLEMENTATION">Implementation</option><option value="DOCUMENTATION">Documentation</option><option value="INTEGRATION">Integration</option></select></div>
            <div className="field"><label htmlFor={`criterion-key-${index}`}>Stable key</label><input id={`criterion-key-${index}`} className="control" value={criterion.key} onChange={(event) => updateCriterion(index, "key", event.target.value)} /></div>
            <div className="field wide"><label htmlFor={`criterion-rule-${index}`}>Observable requirement</label><textarea id={`criterion-rule-${index}`} className="control" minLength={40} maxLength={360} value={criterion.requirement} onChange={(event) => updateCriterion(index, "requirement", event.target.value)} placeholder="Describe a behavior or documented capability validators can inspect in pinned source…" required /></div>
            <div className="field wide"><label htmlFor={`criterion-evidence-${index}`}>Evidence expectations</label><textarea id={`criterion-evidence-${index}`} className="control" maxLength={240} value={criterion.evidence_expectations} onChange={(event) => updateCriterion(index, "evidence_expectations", event.target.value)} placeholder="Name the source evidence that would substantiate this requirement…" required /></div>
          </div></div>)}
        <div className="field" style={{ marginTop: 20 }}><label htmlFor="program-deadline">Submission deadline</label><input id="program-deadline" className="control" type="datetime-local" value={deadlineInput} onChange={(event) => setDeadlineInput(event.target.value)} required /><small>Contract execution time enforces a deadline 1–90 days from publication. Displayed time is UTC after signing.</small></div>
        <div className="callout" style={{ marginBottom: 18 }}>There is no program deposit, prize pool, payout, or hiring approval. Wallets may pay network fees for their own transactions.</div>
        <details className="panel" style={{ padding: 16, marginBottom: 18, background: "#fafbff" }}><summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>Review immutable publication payload</summary><p className="helper" style={{ marginTop: 12 }}>The wallet signs the fields above, all criteria, the UTC deadline ({previewDeadline ? formatDate(previewDeadline) : "not set"}), and the terms digest calculated from that exact payload.</p><div className="hash">Criteria: {criteria.length} · schema v1 · no outcome controls</div></details>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="button" type="submit" disabled={busy || !wallet || wrongNetwork}>{busy ? <><span className="spinner" /> Publishing…</> : "Review and sign publication"}</button><Link className="button secondary" href="/">Cancel</Link></div>
      </form>
    </div>;
  }

  function evidenceComposer(isRevision: boolean) {
    if (!program && !isRevision) return null;
    const criterionRows = program?.criteria || [];
    const rawPaths = pathsInput.split(/\r?\n/).map((path) => path.trim()).filter(Boolean);
    const invalidPath = rawPaths.find((path) => {
      try {
        normalizeEvidencePath(path);
        return false;
      } catch {
        return true;
      }
    });
    const paths = rawPaths.filter((path) => {
      try {
        normalizeEvidencePath(path);
        return true;
      } catch {
        return false;
      }
    });
    const markerOwner = isRevision ? entry?.owner || "" : ownerInput.trim().toLowerCase();
    const markerRepo = isRevision ? entry?.repo || "" : repoInput.trim().toLowerCase();
    const markerProgram = program?.program_id || entry?.program_id || "";
    const markerText = wallet && claimNonce ? JSON.stringify({ program_id: markerProgram, wallet: wallet.address.toLowerCase(), repository: `${markerOwner}/${markerRepo}`, challenge_nonce: claimNonce }, null, 2) : "";
    return <form className="panel" onSubmit={isRevision ? submitRevision : submitEntry}>
      <div className="panel-title"><div><div className="eyebrow">Evidence Studio</div><h2 style={{ marginTop: 7 }}>{isRevision ? "Pin a corrected revision" : "Bind your public work"}</h2><p>All files and the claim marker are resolved at one immutable commit.</p></div><span className="tag">No file upload</span></div>
      {!isRevision && <div className="form-grid"><div className="field"><label htmlFor="github-owner">GitHub owner</label><input id="github-owner" className="control" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} placeholder="organization" autoCapitalize="none" required /></div><div className="field"><label htmlFor="github-repo">Repository</label><input id="github-repo" className="control" value={repoInput} onChange={(event) => setRepoInput(event.target.value)} placeholder="project-name" autoCapitalize="none" required /></div></div>}
      <div className="field"><label htmlFor="commit-sha">Full commit SHA</label><input id="commit-sha" className="control hash" value={shaInput} onChange={(event) => setShaInput(event.target.value)} placeholder="40 hexadecimal characters" autoCapitalize="none" required /><small>Use the exact commit that contains the marker and every evidence file.</small></div>
      <div className="field"><label htmlFor="evidence-paths">Evidence paths, one per line (maximum three)</label><textarea id="evidence-paths" className="control hash" aria-invalid={Boolean(invalidPath)} aria-describedby={invalidPath ? "evidence-paths-error" : undefined} value={pathsInput} onChange={(event) => setPathsInput(event.target.value)} placeholder={'src/parser.ts\ndocs/usage.md'} /><small>Relative, allowlisted GitHub paths only. No directory traversal, URLs, or pasted source.</small>{invalidPath && <p id="evidence-paths-error" className="error-message" role="alert">Remove the invalid path “{invalidPath}” before mapping evidence.</p>}</div>
      <div className="field"><span className="field-label">Map paths to every criterion</span><div>{criterionRows.map((criterion, index) => <div className="mapping-row" key={criterion.key}><div><strong>C{index + 1} · {criterion.key}</strong><p>{criterion.requirement}</p></div><select className="control" aria-label={`Evidence paths for criterion ${index + 1}`} multiple value={evidenceMapping[String(index)] || []} onChange={(event) => setEvidencePaths(index, [...event.currentTarget.selectedOptions].map((option) => option.value))} size={Math.max(2, Math.min(4, paths.length + 1))}>{paths.map((path) => <option key={path} value={path}>{path}</option>)}</select></div>)}</div><small>Select one or more listed paths for each criterion.</small></div>
      <div className="panel" style={{ padding: 17, background: "#fbfbfd" }}><div className="panel-title"><div><div className="eyebrow">Revision-locked claim</div><h3 style={{ marginTop: 6 }}>Prepare the marker before filing</h3></div><button type="button" className="button secondary" onClick={generateNonce}>Generate nonce</button></div>
        <p className="helper">Commit this exact JSON at <span className="hash">.entrew/claim.json</span>, then paste the resulting commit SHA above. The marker binds program, wallet, repository, and a unique nonce; it cannot include its own SHA. Generate a new nonce for every corrected revision.</p>
        <div className="field"><label htmlFor="claim-nonce">Challenge nonce</label><input id="claim-nonce" className="control hash" value={claimNonce} onChange={(event) => setClaimNonce(event.target.value)} placeholder="Generate 32 lowercase hex characters" /></div>
        {markerText && <pre className="marker-preview">{markerText}</pre>}
      </div>
      <div className="callout" style={{ marginTop: 16 }}>The wallet proves control of that address for this transaction. The marker proves an association with this revision, not a person&apos;s identity, authorship, or ownership.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}><button className="button" type="submit" disabled={busy || !wallet || wrongNetwork}>{busy ? <><span className="spinner" /> Submitting…</> : isRevision ? "Sign corrected revision" : "Sign application"}</button><Link className="button secondary" href={`/program?ref=${encodeURIComponent(program?.program_id || entry?.program_id || "")}`}>Back to rubric</Link></div>
    </form>;
  }

  function applyPage() {
    return <div className="page narrow">
      {sharedFeedback()}{loadingMessage()}
      {!program && <section className="panel"><h1 className="record-empty-title">Program unavailable</h1><p className="helper">This program could not be loaded from the finalized registry.</p></section>}
      {program && <><div className="eyebrow"><span className="eyebrow-mark" />Evidence Studio · {program.program_id}</div><h1 style={{ fontSize: "clamp(35px,5vw,54px)" }}>Build a revision<br />the rules can read.</h1><p className="lede">{program.title}</p>
        {nowSeconds !== null && program.deadline <= nowSeconds ? <EmptyState title="This program is closed" detail={`Its deadline was ${formatDate(program.deadline)}. The contract enforces the cutoff.`} /> : <div className="split-layout" style={{ marginTop: 25 }}><section className="panel"><div className="panel-title"><div><div className="eyebrow">Fixed rubric</div><h2 style={{ marginTop: 7 }}>What validators will assess</h2></div></div><CriteriaList criteria={program.criteria} /><div className="callout blue" style={{ marginTop: 15 }}>This side of the workbench reads only the published terms. Your revision cannot edit them.</div></section><div>{evidenceComposer(false)}</div></div>}
      </>}
    </div>;
  }

  function assessmentPanel(candidate: ReviewAttempt) {
    return <div className="panel" key={candidate.attempt_id}>
      <div className="panel-title"><div><span className="eyebrow">Attempt {candidate.attempt_id} · {formatDate(candidate.assessed_at)}</span><h3 style={{ marginTop: 7 }}>Decision anatomy</h3></div><OutcomeTag value={candidate.outcome} /></div>
      <div className="callout blue">Provenance <strong>{candidate.provenance.replaceAll("_", " ")}</strong> · issue <span className="hash">{candidate.issue_code}</span> · review rules v{candidate.review_version}</div>
      {candidate.outcome === "INCONCLUSIVE" && candidate.provenance === "PROVIDER_UNAVAILABLE" && candidate.issue_code === "GITHUB_403_AMBIGUOUS" && <div className="callout" style={{ marginTop: 10 }}>Evidence could not be verified because GitHub is temporarily unavailable to the validator. No eligibility decision was made.</div>}
      <div className="anatomy-list" style={{ marginTop: 9 }}>{candidate.criteria.map((row) => {
        const criterion = program?.criteria[row.index];
        return <article className="anatomy" key={`${candidate.attempt_id}-${row.index}`}><span className="index">C{row.index + 1}</span><div><h3>{criterion?.key || `Criterion ${row.index + 1}`}</h3><p>{criterion?.requirement || "Criterion text unavailable from current program read."}</p><p style={{ marginTop: 8 }}>{row.explanation || "No explanation was stored for this criterion."}</p><div className="source-list">{row.evidence_paths.map((path) => <span className="source-chip" key={path}>{path}</span>)}{!row.evidence_paths.length && <span className="source-chip">No bound file citation</span>}</div></div><OutcomeTag value={row.status} /></article>;
      })}</div>
      <div className="section-head" style={{ margin: "15px 0 8px" }}><strong style={{ fontSize: 12 }}>Bound source fingerprints</strong><span className="hash">{candidate.repo} · {candidate.commit_sha}</span></div>
      <div className="source-list">{candidate.files.map((file) => <span className="source-chip" key={file.path}>{file.path} · sha256 {file.sha256}</span>)}{candidate.marker_sha256 && <span className="source-chip">claim marker sha256 {candidate.marker_sha256}</span>}</div>
    </div>;
  }

  function evidencePage() {
    if (loadState === "loading") return <div className="page narrow">{loadingMessage()}</div>;
    const currentAttempts = attempts.filter((item) => item.revision_id === revision?.revision_id);
    const lastAttempt = currentAttempts[currentAttempts.length - 1];
    const canAssess = Boolean(entry && revision && program && wallet && nowSeconds !== null && wallet.address.toLowerCase() === entry.applicant.toLowerCase() && wallet.chainId === NETWORK.id && entry.current_result !== "QUALIFIED" && entry.deadline_snapshot > nowSeconds && (!lastAttempt || (lastAttempt.outcome === "INCONCLUSIVE" && currentAttempts.length < 3 && lastAttempt.assessed_at + 600 <= nowSeconds)));
    return <div className="page narrow">
      <div className="eyebrow"><span className="eyebrow-mark" />Decision Anatomy · {entryId || "entry missing"}</div>{sharedFeedback()}{loadingMessage()}
      {!(entry && revision && program) && <section className="panel"><h1 className="record-empty-title">Evidence record unavailable</h1><p className="helper">No finalized record could be loaded for this entry.</p></section>}
      {entry && revision && program && <>
        <section className="decision-hero"><div><div className="card-meta"><span>Applicant {shortAddress(entry.applicant)}</span><OutcomeTag value={entry.current_result} /></div><h1>{program.title}</h1><p>{entry.owner}/{entry.repo} · revision {revision.revision_index} of {entry.revision_count} · current snapshot {revision.snapshot_digest}</p></div><div className="decision-orb" aria-hidden="true">◎</div></section>
        <div className="timeline" aria-label="Transaction and decision status"><div className="timeline-step done"><strong>01 · Filed</strong>Revision stored in contract</div><div className={currentAttempts.length ? "timeline-step done" : "timeline-step"}><strong>02 · Assessed</strong>{currentAttempts.length ? `${currentAttempts.length} attempt(s)` : "Awaiting applicant request"}</div><div className={lastAttempt ? "timeline-step done" : "timeline-step"}><strong>03 · Finalized</strong>{lastAttempt ? lastAttempt.outcome.replaceAll("_", " ") : "No product result yet"}</div><div className={entry.current_result === "QUALIFIED" ? "timeline-step done" : "timeline-step"}><strong>04 · Roster</strong>{entry.qualified ? "Canonical roster member" : "Not on qualified roster"}</div></div>
        <div className="split-layout" style={{ marginTop: 17 }}><section className="panel"><div className="panel-title"><div><div className="eyebrow">Immutable requirement set</div><h2 style={{ marginTop: 7 }}>Published criteria</h2></div></div><CriteriaList criteria={program.criteria} /><div className="callout" style={{ marginTop: 15 }}>Published by {shortAddress(program.organizer)} · terms digest <span className="hash">{program.terms_digest}</span></div></section>
          <div><section className="panel"><div className="panel-title"><div><div className="eyebrow">Exact evidence revision</div><h2 style={{ marginTop: 7 }}>Source provenance</h2></div></div><div className="row-item"><div><strong>{revision.owner}/{revision.repo}</strong><p>Full commit SHA</p></div><span className="hash">{revision.commit_sha}</span></div><div className="row-item"><div><strong>Revision digest</strong><p>Paths and criterion mappings normalized by contract</p></div><span className="hash">{revision.snapshot_digest}</span></div><div><strong className="helper">Evidence paths</strong><div className="source-list">{revision.evidence_paths.map((path) => <span className="source-chip" key={path}>{path}</span>)}</div></div><p className="helper" style={{ marginTop: 14 }}>Claim marker path <span className="hash">.entrew/claim.json</span> is fetched separately at this same SHA.</p></section>
            <section className="panel" style={{ marginTop: 16 }}><div className="panel-title"><div><div className="eyebrow">Applicant control</div><h3 style={{ marginTop: 6 }}>Review this snapshot</h3></div>{currentAttempts.length > 0 && <span className="tag">{currentAttempts.length} attempt(s)</span>}</div>
              {!wallet && <p className="helper">Connect the applicant wallet to request an assessment or retry an inconclusive result.</p>}
              {wallet && wallet.address.toLowerCase() !== entry.applicant.toLowerCase() && <p className="helper">Connected wallet differs from the applicant wallet. Public reading stays available.</p>}
              {lastAttempt?.outcome === "INCONCLUSIVE" && <div className="callout">Same-snapshot retry is available only after the contract&apos;s 10-minute cooldown, at most twice. Local countdown is advisory.</div>}
              {entry.current_result === "QUALIFIED" && <div className="callout green">Qualification is terminal. The roster is read from the finalized contract; there is no organizer review action.</div>}
              {nowSeconds !== null && entry.deadline_snapshot <= nowSeconds && <div className="callout red">The program deadline has passed. The contract blocks additional writes.</div>}
              {canAssess ? <button className="button" style={{ marginTop: 15 }} disabled={busy} onClick={() => void assessCurrentRevision()}>{busy ? <><span className="spinner" /> Requesting review…</> : lastAttempt ? "Retry inconclusive snapshot" : "Request independent assessment"}</button> : null}
            </section></div></div>
        <div className="section-head"><div><div className="eyebrow"><span className="eyebrow-mark" />Immutable history</div><h2 style={{ marginTop: 9 }}>Revisions</h2></div><span className="helper">{revisions.length} shown · maximum four</span></div>
        <div className="panel">{revisions.map((item) => <div className="row-item" key={item.revision_id}><div><strong>{item.revision_id} · {item.owner}/{item.repo}</strong><p className="hash">{item.commit_sha} · {item.snapshot_digest}</p></div><div style={{ display: "grid", gap: 5, justifyItems: "end" }}><span className="tag">{item.provenance}</span>{item.final_outcome && <OutcomeTag value={item.final_outcome} />}</div></div>)}</div>
        <div className="section-head"><div><div className="eyebrow"><span className="eyebrow-mark" />Review history</div><h2 style={{ marginTop: 9 }}>Every finalized attempt</h2></div><span className="helper">{attempts.length} shown</span></div>
        {attempts.length ? <div className="row-list">{attempts.slice().reverse().map(assessmentPanel)}</div> : <EmptyState title="No assessment has finalized" detail="An applicant can request an independent assessment before the program deadline." />}
        {entry.current_result !== "QUALIFIED" && nowSeconds !== null && entry.deadline_snapshot > nowSeconds && wallet?.address.toLowerCase() === entry.applicant.toLowerCase() && <section style={{ marginTop: 35 }}><div className="eyebrow"><span className="eyebrow-mark" />Correction path</div><h2 style={{ marginTop: 9 }}>A new revision keeps the old record intact.</h2><p className="helper" style={{ marginBottom: 15 }}>Submit a different full SHA and fresh same-revision marker. The contract enforces the four-revision cap.</p><div className="split-layout"><div className="panel"><CriteriaList criteria={program.criteria} /></div><div>{evidenceComposer(true)}</div></div></section>}
      </>}
    </div>;
  }

  function workspacePage() {
    return <div className="page narrow"><div className="eyebrow"><span className="eyebrow-mark" />Wallet workspace</div><h1 style={{ fontSize: "clamp(36px,5vw,58px)" }}>Your on-chain<br />program record.</h1><p className="lede">Organizer publications and applicant entries are separate, paginated views from the current wallet.</p>{sharedFeedback()}{loadingMessage()}
      {!wallet && <EmptyState title="Connect a wallet to see your workspace" detail="Public program pages and decision records remain readable without a wallet." action={<button className="button" onClick={() => void openWalletPicker()}>Connect wallet</button>} headingLevel={2} />}
      {wallet && (loadState === "ready" || loadState === "empty") && <><div className="callout blue">Connected as <span className="hash">{wallet.address}</span>. Wallet signatures do not establish person-level identity. No cross-wallet applicant matching is performed.</div><div className="panel" style={{ marginTop: 18 }}><div className="tabs" role="tablist" aria-label="Workspace records"><button className="tab" role="tab" aria-selected={workspaceTab === "applications"} onClick={() => setWorkspaceTab("applications")}>Applications · {walletEntryCount}</button><button className="tab" role="tab" aria-selected={workspaceTab === "publications"} onClick={() => setWorkspaceTab("publications")}>Publications · {walletProgramCount}</button></div>
        {workspaceTab === "applications" ? walletEntries.length ? <div className="row-list">{walletEntries.map((item) => <Link className="row-item" key={item.entry_id} href={`/evidence?entry=${encodeURIComponent(item.entry_id)}`}><div><strong>{item.owner}/{item.repo}</strong><p>{item.entry_id} · program {item.program_id} · {item.revision_count} revision(s)</p></div><OutcomeTag value={item.current_result} /></Link>)}</div> : <EmptyState title="No applications from this wallet" detail="Your entries will appear after a finalized canonical submission." action={<Link className="button secondary" href="/">Browse programs</Link>} headingLevel={2} />
          : walletPrograms.length ? <div className="row-list">{walletPrograms.map((item) => <Link className="row-item" key={item.program_id} href={`/program?ref=${encodeURIComponent(item.program_id)}`}><div><strong>{item.title}</strong><p>{item.program_id} · deadline {formatDate(item.deadline)}</p></div><span className="hash">{item.terms_digest.slice(0,14)}…</span></Link>)}</div> : <EmptyState title="No programs published by this wallet" detail="A published rubric remains immutable and has no applicant verdict controls." action={<Link className="button secondary" href="/publish">Publish a program</Link>} headingLevel={2} />}
        <div className="row-item"><span className="helper">Records {workspaceTab === "applications" ? (walletEntryCount ? workspaceApplicationOffset + 1 : 0) : (walletProgramCount ? workspacePublicationOffset + 1 : 0)}–{workspaceTab === "applications" ? Math.min(workspaceApplicationOffset + walletEntries.length, walletEntryCount) : Math.min(workspacePublicationOffset + walletPrograms.length, walletProgramCount)} of {workspaceTab === "applications" ? walletEntryCount : walletProgramCount}</span><div style={{ display: "flex", gap: 7 }}><button className="button secondary" disabled={(workspaceTab === "applications" ? workspaceApplicationOffset : workspacePublicationOffset) === 0} onClick={() => workspaceTab === "applications" ? setWorkspaceApplicationOffset(Math.max(0, workspaceApplicationOffset - 25)) : setWorkspacePublicationOffset(Math.max(0, workspacePublicationOffset - 25))}>Previous</button><button className="button secondary" disabled={workspaceTab === "applications" ? workspaceApplicationOffset + 25 >= walletEntryCount : workspacePublicationOffset + 25 >= walletProgramCount} onClick={() => workspaceTab === "applications" ? setWorkspaceApplicationOffset(workspaceApplicationOffset + 25) : setWorkspacePublicationOffset(workspacePublicationOffset + 25)}>Next</button></div></div>
        </div></>}
    </div>;
  }

  function activityPage() {
    return <div className="page narrow"><div className="eyebrow"><span className="eyebrow-mark" />Transaction activity</div><h1 style={{ fontSize: "clamp(36px,5vw,58px)" }}>A receipt is a checkpoint,<br />not the destination.</h1><p className="lede">Recover submitted hashes from this browser and compare protocol progress with exact finalized contract state.</p>{sharedFeedback()}
      <div className="callout blue">ENTREW stores only submitted transaction hashes and limited recovery metadata in this browser. A finalized execution without matching canonical state never becomes an application result.</div>
      {activityRecords.length ? <div className="panel" style={{ marginTop: 18 }}>{activityRecords.map((record) => {
        const result = activityResults[record.hash];
        return <article className="row-item" key={record.hash} style={{ alignItems: "start" }}><div style={{ minWidth: 0, flex: 1 }}><div className="card-meta"><strong>{record.operation.replaceAll("_", " ")}</strong><span>{new Date(record.submittedAt).toLocaleString()}</span></div><a className="hash" href={`${NETWORK.explorer}/tx/${record.hash}`} target="_blank" rel="noreferrer">{record.hash} ↗</a><p className="hash">{record.signer} · chain {record.chainId} · contract {record.contractAddress}</p>{result && <div className="status-message" role="status"><strong>{result.label}</strong><br />{result.detail}</div>}</div><button className="button secondary" disabled={recoveringHash === record.hash} onClick={() => void recover(record)}>{recoveringHash === record.hash ? <><span className="spinner" /> Checking…</> : "Reconcile"}</button></article>;
      })}</div> : <EmptyState title="No submitted hashes in this browser" detail="After a wallet submits a transaction, ENTREW stores its hash for recovery. The chain remains the source of truth." headingLevel={2} />}
      <div className="callout" style={{ marginTop: 16 }}>Changing wallets does not delete a transaction or make the provider disconnect. An unknown hash stays recoverable; ENTREW never rebroadcasts it automatically.</div>
    </div>;
  }

  function mainContent() {
    if (page === "explorer") return <div className="page">{explorerPage()}</div>;
    if (page === "program") return <div className="page">{programPage()}</div>;
    if (page === "publish") return publishPage();
    if (page === "apply") return applyPage();
    if (page === "evidence") return evidencePage();
    if (page === "workspace") return workspacePage();
    return activityPage();
  }

  return <div className="app-shell">
    <header className="site-header"><div className="header-inner"><Link className="brand" href="/" aria-label="ENTREW home"><span className="brand-mark">e.</span><span>entrew<span className="brand-dot">.</span></span></Link>{nav}<div className="header-actions">
      <span className="network-pill"><i className="network-dot" />Studionet · 61999</span>
      {wallet ? <><span className="wallet-pill" title={`${wallet.name} · ${wallet.address}`}>{wallet.name} · {shortAddress(wallet.address)}</span>{wrongNetwork ? <button className="button coral connect" onClick={() => void switchWalletNetwork()}>Switch network</button> : <button className="button secondary connect" onClick={disconnectApp}>Disconnect</button>}</> : <button className="button connect" onClick={() => void openWalletPicker()} disabled={connecting}>{connecting ? "Connecting…" : "Connect wallet"}</button>}
      <button className="mobile-menu" aria-label={mobileMenu ? "Close menu" : "Open menu"} aria-expanded={mobileMenu} onClick={() => setMobileMenu((value) => !value)}>{mobileMenu ? "×" : "☰"}</button>
    </div></div></header>
    <main>{mainContent()}</main>
    <footer className="footer"><div className="footer-inner"><span><strong>entrew.</strong> Evidence Atlas for developer programs.</span><span>One contract · Studionet 61999 · Public GitHub evidence</span><span>Wallet address is not a person identity.</span></div></footer>
    {walletModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeWalletModal(); }}><section ref={walletModalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="wallet-heading" tabIndex={-1}><div className="panel-title"><div><div className="eyebrow">Wallet selection</div><h2 id="wallet-heading">Choose a signing wallet</h2></div><button className="button ghost" onClick={closeWalletModal} aria-label="Close wallet selection">×</button></div><p>Public reads do not use this wallet. It signs only the action you submit.</p>{walletOptions.map((option) => <button className="wallet-choice" key={option.id} disabled={connecting} onClick={() => void chooseWallet(option)}><span className="wallet-icon">◇</span><span>{option.name}</span></button>)}{walletError && <div className="error-message" role="alert">{walletError}</div>}</section></div>}
  </div>;
}
