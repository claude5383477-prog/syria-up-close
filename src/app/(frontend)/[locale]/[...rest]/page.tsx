import { notFound } from 'next/navigation'

// Any path no other route matches: the site's own 404 page (with the header, footer and city links)
// instead of the framework default, still answered with a 404 status. Lowest-priority route.
export default function Unknown() {
  notFound()
}
