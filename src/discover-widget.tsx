import "./main.css";
import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import {
  Plus,
  Check,
  BuildingWorkspace,
} from "@openai/apps-sdk-ui/components/Icon";

type DiscoverCompany = {
  domain?: string;
  organization?: string;
  logo?: string;
  emails_count?: {
    personal?: number;
    generic?: number;
    total?: number;
  };
  industry?: string;
  location?: string;
  hiring?: boolean;
  already_saved?: boolean;
};

type OpenAiGlobals = {
  toolInput?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolOutput?: any;
};

type GlobalsState = {
  toolInput: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolOutput: any;
};

type OpenAiWithTools = {
  openai?: {
    callTool?: (name: string, input: unknown) => Promise<unknown>;
  };
};

function readGlobals(): GlobalsState {
  const openai = (window as unknown as { openai?: OpenAiGlobals }).openai ?? {};
  return {
    toolInput: openai.toolInput ?? null,
    toolOutput: openai.toolOutput ?? null,
  };
}

// Logo component that handles image load errors with React state
function CompanyLogo({
  logo,
  companyName,
}: {
  logo?: string;
  companyName: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!logo || imageError) {
    return (
      <div className="w-full h-full bg-[var(--color-background-primary-soft-alpha)] flex items-center justify-center overflow-hidden">
        <BuildingWorkspace className="w-6 h-6 text-tertiary" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[var(--color-surface-primary)]">
      <img
        src={logo}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

// Single company row
function CompanyListItem({ company }: { company: DiscoverCompany }) {
  const companyName =
    company.organization || company.domain || "Unknown Company";
  const emailCount = company.emails_count?.total ?? 0;
  const emailText =
    emailCount > 0
      ? `${emailCount.toLocaleString()} email${
          emailCount === 1 ? " address" : " addresses"
        }`
      : null;

  // Construct logo URL from domain (logo is always constructed from domain)
  const logoUrl = company.domain
    ? `https://company-logo.hunter.io/${company.domain}`
    : undefined;

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(Boolean(company.already_saved));

  async function handleSaveClick() {
    if (isSaving || isSaved || !company.domain) return;

    const openai = (window as unknown as OpenAiWithTools).openai;
    if (!openai?.callTool) return;

    setIsSaving(true);
    try {
      await openai.callTool("save", { domain: company.domain });
      setIsSaved(true);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-primary-soft-alt)] hover:bg-[var(--color-surface-secondary)] transition-colors">
      {/* Logo or placeholder */}
      <div className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-lg overflow-hidden outline outline-[1.5px] outline-solid outline-[var(--color-border-primary-soft-alt)] -outline-offset-[1.5px]">
        <CompanyLogo logo={logoUrl} companyName={companyName} />
      </div>

      {/* Company info */}
      <div className="flex-1 min-w-0">
        <span className="flex items-center">
          <span className="text text-primary">{companyName}</span>
          {company.hiring && (
            <span className="text-secondary">&nbsp;· Hiring</span>
          )}
        </span>
        {(emailText || company.industry || company.location) && (
          <span className="text-sm text-secondary flex items-center gap-1 block">
            {emailText && (
              <span className="whitespace-nowrap">{emailText}</span>
            )}
            {emailText && company.industry && (
              <span className="whitespace-nowrap" aria-hidden="true">
                ·
              </span>
            )}
            {company.industry && (
              <span className="truncate">{company.industry}</span>
            )}
            {(emailText || company.industry) && company.location && (
              <span className="whitespace-nowrap" aria-hidden="true">
                ·
              </span>
            )}
            {company.location && (
              <span className="whitespace-nowrap">{company.location}</span>
            )}
          </span>
        )}
      </div>

      {/* Plus button */}
      <Button
        size="md"
        variant="soft"
        color="secondary"
        uniform
        className="ml-2"
        loading={isSaving}
        inert={isSaved}
        onClick={handleSaveClick}
        aria-label={`Add ${companyName} to saved companies`}
      >
        {isSaved ? <Check /> : <Plus />}
      </Button>
    </li>
  );
}

// Stacked logos for the footer "+ more" indicator
function FooterLogoStack({ logos }: { logos: string[] }) {
  return (
    <div className="relative w-[44px] h-[44px]" aria-hidden="true">
      {[
        // Top (on front)
        { index: 0, dx: -6, dy: -6, zClass: "z-10" },
        // Bottom (behind)
        { index: 1, dx: 6, dy: 6, zClass: "z-0" },
      ].map((slot) => {
        const logoUrl = logos[slot.index];
        const isLogo = Boolean(logoUrl);
        const bgClass = isLogo
          ? "bg-[var(--color-text-primary-solid)]"
          : "bg-[var(--color-background-primary-soft)]";

        return (
          <div
            key={slot.index}
            className={`absolute top-1/2 left-1/2 w-[32px] h-[32px] rounded-md overflow-hidden border border-white outline outline-[1.5px] outline-solid outline-[var(--color-border-primary-soft-alt)] -outline-offset-[1.5px] flex items-center justify-center ${bgClass} ${slot.zClass}`}
            style={{
              transform: `translate(calc(-50% ${slot.dx >= 0 ? "+" : "-"} ${Math.abs(
                slot.dx
              )}px), calc(-50% ${slot.dy >= 0 ? "+" : "-"} ${Math.abs(slot.dy)}px))`,
            }}
          >
            {isLogo ? (
              <img
                src={logoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <BuildingWorkspace className="w-6 h-6 text-tertiary" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DiscoverWidget() {
  const [globals, setGlobals] = useState<GlobalsState>(readGlobals);
  const [remainingLogos, setRemainingLogos] = useState<string[]>([]);

  useEffect(() => {
    function handleSetGlobals() {
      setGlobals(readGlobals());
    }

    window.addEventListener("openai:set_globals", handleSetGlobals);
    return () => {
      window.removeEventListener("openai:set_globals", handleSetGlobals);
    };
  }, []);

  // Extract the data array + meta from toolOutput.
  // The tool returns either the full JSON (with data/meta) or just an array.
  const rawOutput = globals.toolOutput;
  const companies: DiscoverCompany[] = Array.isArray(rawOutput?.data)
    ? (rawOutput.data as DiscoverCompany[])
    : Array.isArray(rawOutput)
      ? (rawOutput as DiscoverCompany[])
      : [];

  const totalResults = rawOutput?.meta?.results ?? companies.length;
  const permalink = rawOutput?.meta?.permalink;

  useEffect(() => {
    const companiesToCheck = companies.slice(5, 15); // Skip first 5, check next 10
    const logoUrls = companiesToCheck
      .filter((company) => !!company.domain)
      .map((company) => `https://company-logo.hunter.io/${company.domain}`);

    const checkLogos = async () => {
      const validLogos: string[] = [];
      for (const logoUrl of logoUrls) {
        if (validLogos.length >= 2) break;

        const exists = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = logoUrl;
        });

        if (exists) {
          validLogos.push(logoUrl);
        }
      }
      setRemainingLogos(validLogos);
    };

    checkLogos();
  }, [companies]);

  const isLoading = !globals.toolOutput;

  if (isLoading) {
    return (
      <span className="text-sm text-secondary" role="status" aria-live="polite">
        Loading discover results...
      </span>
    );
  }

  if (companies.length === 0) {
    return (
      <span className="text-sm text-secondary" role="status">
        No companies found.
      </span>
    );
  }

  // Show first 5 companies
  const displayCompanies = companies.slice(0, 5);
  const remainingCount = Math.max(0, totalResults - displayCompanies.length);

  function handleViewInHunterClick() {
    const baseHref = permalink || "https://hunter.io/discover";
    let href = baseHref;

    try {
      const url = new URL(baseHref);
      url.searchParams.set("utm_source", "hunter-chatgpt");
      href = url.toString();
    } catch {
      // If URL parsing fails, fall back to the original href without UTM
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openai = (window as any).openai;
    if (openai?.openExternal) {
      openai.openExternal({ href });
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="w-full rounded-2xl border border-[0.5px] border-[var(--color-border-primary-outline)] shadow-[var(--shadow-300)] p-4">
      {/* Title */}
      <div className="mb-2">
        <h2 className="text-lg font-medium text">
          {totalResults.toLocaleString()}{" "}
          {totalResults === 1 ? "company" : "companies"} match your filters
        </h2>
      </div>

      {/* Company list */}
      <ul className="-mx-4 py-1 list-none">
        {displayCompanies.map((company, index) => (
          <CompanyListItem key={company.domain ?? index} company={company} />
        ))}
      </ul>

      {/* Footer with "X more" and "Open in Hunter" */}
      {remainingCount > 0 && (
        <footer className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <FooterLogoStack logos={remainingLogos} />
            <span className="text-secondary">
              + {remainingCount.toLocaleString()} more
            </span>
          </div>
          <Button
            color="primary"
            size="sm"
            variant="outline"
            onClick={handleViewInHunterClick}
          >
            Open in Hunter
          </Button>
        </footer>
      )}
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <DiscoverWidget />
    </StrictMode>
  );
}
