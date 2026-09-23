import type { Config } from "@netlify/functions";

/**
 * Tells the public page which server features this deploy actually has.
 *
 * The same files are also published as a purely static site, where no API
 * exists at all. The page asks this endpoint only after a visitor opens the
 * enquiry or the assistant, so an ordinary visit still contacts no service.
 * No request data is read, logged or stored here.
 */
export default async () =>
  Response.json(
    {
      enquiries: true,
      assistant: Boolean(process.env.ANTHROPIC_API_KEY || process.env.NETLIFY_AI_GATEWAY_KEY),
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );

export const config: Config = {
  path: "/api/capabilities",
  method: "GET",
};
