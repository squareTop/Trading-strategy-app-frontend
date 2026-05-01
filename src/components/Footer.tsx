export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer>
      <div>
        © {year} FoxelSignal. Built for strategy research and decision support.
      </div>
      <div>Not financial advice. Always do your own research.</div>
    </footer>
  )
}
