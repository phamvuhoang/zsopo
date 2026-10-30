import { notFound } from "next/navigation";

// Proxy rewrites missing public resources here before their shell can stream.
export default function MissingPage() {
  notFound();
}
