import { kebabCase } from "change-case";

export function normalizeTokenSetName(name: string): string {
  // TODO: This doesn't quite match the output from `npx @digdir/designsystemet tokens`
  // when it comes to the folder structure of the output directory
  return kebabCase(name);
}

export function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}
