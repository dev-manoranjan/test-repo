export type Inputs = Record<string, string>;

export function grantCredits(
  inputs: Inputs,
  installationId: string,
  onError: (msg: string) => void,
  onGrant: (amount: number) => void,
): void {
  const raw = inputs[installationId] ?? "";
  if (!raw) {
    onError("Please enter credits");
    return;
  }
  const credits = Number(raw);
  if (credits > 0) {
    onGrant(credits);
  } else {
    onError("Invalid amount");
  }
}
