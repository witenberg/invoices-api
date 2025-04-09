export const currencies = ["PLN", "EUR", "USD", "GBP"] as const
export const languages = ["Polski", "English", "Deutsch", "Français"] as const

export type Currency = (typeof currencies)[number]
export type Language = (typeof languages)[number]

export const currencyLabels: Record<Currency, string> = {
  PLN: "PLN - Polish Złoty",
  EUR: "EUR - Euro",
  USD: "USD - US Dollar",
  GBP: "GBP - British Pound",
}

export const languageLabels: Record<Language, string> = {
  Polski: "Polski",
  English: "English",
  Deutsch: "Deutsch",
  Français: "Français",
}

