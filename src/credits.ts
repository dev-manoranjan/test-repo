'use client';

import { Button } from '@/components';
import { Badge, Input, LoadingSpinner } from '@/components/ui';
import {
  formatAdminLine,
  formatApprovedAtLine,
  formatCreditBalance,
  formatRegisteredLine,
  whitelistStatusLabel,
} from './review-access-formatters';
import type {
  InstallationGroup,
  ReviewAccessEntry,
  ReviewAccessListStatus,
} from './types';
import { reviewAccessRowKey } from './types';

function CreditBalanceBadge({
  balance,
}: {
  balance: number | null | undefined;
}) {
  const hasBalance = typeof balance === 'number';
  return (
    <Badge variant={hasBalance ? 'secondary' : 'outline'} size="sm">
      Credits: {formatCreditBalance(balance)}
    </Badge>
  );
}

type CreditGrantFormProps = {
  installationId: string;
  creditInput: string;
  isGranting: boolean;
  listBusy: boolean;
  balance: number | null | undefined;
  onCreditInputChange: (installationId: string, value: string) => void;
  onGrant: (installationId: string) => void;
};

function CreditGrantForm({
  installationId,
  creditInput,
  isGranting,
  listBusy,
  balance,
  onCreditInputChange,
  onGrant,
}: CreditGrantFormProps) {
  const inputId = `grant-credits-${installationId}`;
  const canGrant = creditInput.trim().length > 0 && !isGranting && !listBusy;
  const showBillingHint = balance == null;

  return (
    <section
      aria-label={`Grant credits for installation ${installationId}`}
      className="rounded-md border border-border bg-surface p-3"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
        Billing
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-44">
          <Input
            id={inputId}
            label="Grant credits"
            type="number"
            min={1}
            placeholder="e.g. 500"
            value={creditInput}
            onChange={(e) =>
              onCreditInputChange(installationId, e.target.value)
            }
            disabled={isGranting || listBusy}
            helpText={
              showBillingHint
                ? 'No billing record yet — grant to create one'
                : undefined
            }
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          className="shrink-0 sm:mb-0"
          onClick={() => onGrant(installationId)}
          disabled={!canGrant}
        >
          {isGranting ? 'Granting…' : 'Grant credits'}
        </Button>
      </div>
    </section>
  );
}

type ReviewAccessRowActionProps = {
  listStatus: ReviewAccessListStatus;
  isMutatingRow: boolean;
  listBusy: boolean;
  onApprove: () => void;
  onRevoke: () => void;
};

function ReviewAccessRowAction({
  listStatus,
  isMutatingRow,
  listBusy,
  onApprove,
  onRevoke,
}: ReviewAccessRowActionProps) {
  if (listStatus === 'pending') {
    if (isMutatingRow) {
      return (
        <LoadingSpinner
          size="xs"
          layout="inline"
          loadingText="Sending approval email…"
        />
      );
    }
    return (
      <Button variant="outline" onClick={onApprove} disabled={listBusy}>
        Approve
      </Button>
    );
  }

  if (isMutatingRow) {
    return (
      <LoadingSpinner
        size="xs"
        layout="inline"
        loadingText="Revoking whitelist…"
      />
    );
  }

  return (
    <Button
      variant="outline"
      className="border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={onRevoke}
      disabled={listBusy}
    >
      Revoke
    </Button>
  );
}

type ReviewAccessRepoRowProps = {
  entry: ReviewAccessEntry;
  listStatus: ReviewAccessListStatus;
  isMutatingRow: boolean;
  listBusy: boolean;
  onApprove: (entry: ReviewAccessEntry) => void;
  onRevoke: (entry: ReviewAccessEntry) => void;
};

function ReviewAccessRepoRow({
  entry,
  listStatus,
  isMutatingRow,
  listBusy,
  onApprove,
  onRevoke,
}: ReviewAccessRepoRowProps) {
  const approvedAtLine = formatApprovedAtLine(entry);
  const registeredLine =
    listStatus === 'pending' ? formatRegisteredLine(entry) : null;
  const showApprovedBy =
    listStatus === 'approved' &&
    entry.approvedBy != null &&
    String(entry.approvedBy).trim() !== '';

  return (
    <div className="flex items-center justify-between rounded border border-border px-3 py-2">
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-sm font-medium">{entry.repoFullName}</p>
        <p className="text-xs text-text-secondary">
          {whitelistStatusLabel(listStatus, entry)}
        </p>
        <p className="text-xs text-text-secondary">{formatAdminLine(entry)}</p>
        {registeredLine ? (
          <p className="text-xs text-text-secondary">{registeredLine}</p>
        ) : null}
        {listStatus === 'approved' && approvedAtLine ? (
          <p className="text-xs text-text-secondary">{approvedAtLine}</p>
        ) : null}
        {showApprovedBy ? (
          <p className="text-xs text-text-secondary">
            By super admin user id: {entry.approvedBy}
          </p>
        ) : null}
      </div>
      <div
        className="shrink-0"
        role={isMutatingRow ? 'status' : undefined}
        aria-live={isMutatingRow ? 'polite' : undefined}
      >
        <ReviewAccessRowAction
          listStatus={listStatus}
          isMutatingRow={isMutatingRow}
          listBusy={listBusy}
          onApprove={() => onApprove(entry)}
          onRevoke={() => onRevoke(entry)}
        />
      </div>
    </div>
  );
}

type InstallationCreditPanelProps = {
  group: InstallationGroup;
  listStatus: ReviewAccessListStatus;
  balance: number | null | undefined;
  creditInput: string;
  isGranting: boolean;
  listBusy: boolean;
  pendingRowKey: string | null;
  onCreditInputChange: (installationId: string, value: string) => void;
  onGrant: (installationId: string) => void;
  onApprove: (entry: ReviewAccessEntry) => void;
  onRevoke: (entry: ReviewAccessEntry) => void;
};

function InstallationCreditPanel({
  group,
  listStatus,
  balance,
  creditInput,
  isGranting,
  listBusy,
  pendingRowKey,
  onCreditInputChange,
  onGrant,
  onApprove,
  onRevoke,
}: InstallationCreditPanelProps) {
  const { installationId, repos } = group;

  return (
    <div className="bg-surface-secondary rounded-lg border border-border p-4">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Installation
          </p>
          <p className="truncate font-mono text-xs text-text-secondary">
            {installationId}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {repos.length} repo(s) on this page
          </p>
        </div>
        <CreditBalanceBadge balance={balance} />
      </header>

      <CreditGrantForm
        installationId={installationId}
        creditInput={creditInput}
        isGranting={isGranting}
        listBusy={listBusy}
        balance={balance}
        onCreditInputChange={onCreditInputChange}
        onGrant={onGrant}
      />

      <section aria-label="Repositories" className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
          Repositories
        </p>
        <div className="space-y-2">
          {repos.map((entry) => {
            const rowKey = reviewAccessRowKey(entry);
            return (
              <ReviewAccessRepoRow
                key={rowKey}
                entry={entry}
                listStatus={listStatus}
                isMutatingRow={pendingRowKey === rowKey}
                listBusy={listBusy}
                onApprove={onApprove}
                onRevoke={onRevoke}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

export type SuperAdminInstallationGroupsProps = {
  groups: InstallationGroup[];
  listStatus: ReviewAccessListStatus;
  listLoading: boolean;
  listBusy: boolean;
  pendingRowKey: string | null;
  creditInputs: Record<string, string>;
  creditBalances: Record<string, number | null>;
  grantingInstallationId: string | null;
  onCreditInputChange: (installationId: string, value: string) => void;
  onGrant: (installationId: string) => void;
  onApprove: (entry: ReviewAccessEntry) => void;
  onRevoke: (entry: ReviewAccessEntry) => void;
};

export default function SuperAdminInstallationGroups({
  groups,
  listStatus,
  listLoading,
  listBusy,
  pendingRowKey,
  creditInputs,
  creditBalances,
  grantingInstallationId,
  onCreditInputChange,
  onGrant,
  onApprove,
  onRevoke,
}: SuperAdminInstallationGroupsProps) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <InstallationCreditPanel
          key={group.installationId}
          group={group}
          listStatus={listStatus}
          balance={creditBalances[group.installationId]}
          creditInput={creditInputs[group.installationId] ?? ''}
          isGranting={grantingInstallationId === group.installationId}
          listBusy={listBusy}
          pendingRowKey={pendingRowKey}
          onCreditInputChange={onCreditInputChange}
          onGrant={onGrant}
          onApprove={onApprove}
          onRevoke={onRevoke}
        />
      ))}
      {!listLoading && groups.length === 0 && (
        <p className="text-sm text-text-secondary">
          {listStatus === 'approved'
            ? 'No approved repositories yet.'
            : 'No repositories awaiting approval.'}
        </p>
      )}
    </div>
  );
}