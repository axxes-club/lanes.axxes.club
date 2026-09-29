import { PageHeader } from "@/components/ui"
import { SearchView } from "@/components/search-view"

export const dynamic = "force-dynamic"
export const metadata = { title: "Search" }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return (
    <div>
      <PageHeader
        eyebrow="Find anything"
        title="Search"
        description="One search across every board, card and person in this workspace."
      />
      <SearchView initial={q ?? ""} />
    </div>
  )
}
