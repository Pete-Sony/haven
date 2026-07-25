export interface OpenNextMinifierPatchResult {
  readonly changed: boolean;
  readonly target: string;
  readonly versions: {
    readonly aws: string;
    readonly core: string;
    readonly terser: string;
  };
}

export function patchOpenNextNodeMinify(
  root?: string,
): Promise<OpenNextMinifierPatchResult>;
