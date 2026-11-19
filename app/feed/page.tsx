import { Suspense } from "react";
import Feed from "./Feed";

export const metadata = { title: "StudyTube · Feed" };

export default function Page() {
  return (
    <Suspense>
      <Feed />
    </Suspense>
  );
}
