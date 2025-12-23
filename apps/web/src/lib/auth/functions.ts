import { createServerFn } from "@tanstack/react-start";
import { getToken } from "./server";

export const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});
