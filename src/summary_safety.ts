const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\[^\s)]+/g;
const ABSOLUTE_PATH_PATTERN = /\/[^\s)]+(?:\/[^\s)]+)+/g;
const IPV4_PATTERN = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
const URL_WITH_USERINFO_PATTERN = /\bhttps?:\/\/[^/\s:@]+:[^/\s:@]+@[^\s)]+/g;
const ASSIGNMENT_VALUE_PATTERN = /\b([A-Za-z][A-Za-z0-9_.-]{1,31})=([^\s,;]{16,})/g;
const MAX_SUMMARY_CHARS = 240;

export const SUMMARY_SAFETY_RULE = "public_summary_v1";

export function sanitizeSummaryForArtifact(value: string): string {
  return value
    .replace(URL_WITH_USERINFO_PATTERN, "[redacted-url]")
    .replace(WINDOWS_PATH_PATTERN, "[redacted-path]")
    .replace(ABSOLUTE_PATH_PATTERN, "[redacted-path]")
    .replace(IPV4_PATTERN, "[redacted-host]")
    .replace(ASSIGNMENT_VALUE_PATTERN, "$1=[redacted-value]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SUMMARY_CHARS);
}
