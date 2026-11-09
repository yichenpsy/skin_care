/** Translate catalog labels for display while keeping API/database values intact. */
const labels: Record<string, string> = {
  Gesichtsreinigung: 'Cleanser',
  Reinigung: 'Cleanser',
  Feuchtigkeitspflege: 'Moisturizer',
  Sonnenschutz: 'Sunscreen',
  'Grosse Poren': 'Large pores',
  Rötungen: 'Redness',
}

export function displayLabel(value: string): string {
  return labels[value] || value
}
