import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Contact = {
  name: string
  address: string
  network?: string
  addedAt: number
}

interface ContactStore {
  contacts: Contact[]
  addContact: (contact: Omit<Contact, 'addedAt'>) => void
  removeContact: (name: string) => void
  getByName: (name: string) => Contact | undefined
}

export const useContactStore = create<ContactStore>()(
  persist(
    (set, get) => ({
      contacts: [],

      addContact: contact => {
        const normalizedName = contact.name.trim().toLowerCase()
        set(state => {
          const existingIndex = state.contacts.findIndex(c => c.name.trim().toLowerCase() === normalizedName)

          const entry: Contact = {
            name: contact.name.trim(),
            address: contact.address.trim(),
            network: contact.network,
            addedAt: Date.now(),
          }

          if (existingIndex >= 0) {
            const updated = [...state.contacts]
            updated[existingIndex] = entry
            return { contacts: updated }
          }

          return { contacts: [entry, ...state.contacts] }
        })
      },

      removeContact: name => {
        const normalizedName = name.trim().toLowerCase()
        set(state => ({
          contacts: state.contacts.filter(c => c.name.trim().toLowerCase() !== normalizedName),
        }))
      },

      getByName: name => {
        const normalizedName = name.trim().toLowerCase()
        return get().contacts.find(c => c.name.trim().toLowerCase() === normalizedName)
      },
    }),
    {
      name: 'contact-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)
