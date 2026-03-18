type StateCardProps = {
  label: string
  value: string
}

export function StateCard({ label, value }: StateCardProps) {
  return (
    <section className="state-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  )
}
