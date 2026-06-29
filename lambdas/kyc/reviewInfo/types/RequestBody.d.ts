export type Reference = {
  relation: string
  fullName: string
  phoneNumber: string
}

export type RequestBody = {
  clabe: string
  references: [Reference, Reference]
}
