import { SearchForm, PrisonerSearchClientBuilder } from '../data/prisonerSearchClient'
import { properCaseFullName } from '../utils/utils'
import { Elite2ClientBuilder } from '../data/elite2ClientBuilder'
import { SystemToken } from '../types/uof'

export type Prison = {
  agencyId: string
  description: string
}

export type SearchResult = {
  name: string
  prisonNumber: string
  prison: string
  bookingNumber: number
}

const isFormComplete = (form: SearchForm): boolean =>
  Boolean(form.prisonNumber || form.firstName || form.lastName || form.agencyId)

export default class PrisonerSearchService {
  constructor(
    private readonly PrisonerSearchClient: PrisonerSearchClientBuilder,
    private readonly elite2ClientBuilder: Elite2ClientBuilder,
    private readonly systemToken: SystemToken
  ) {}

  private async getPrisonsUsing(token: string): Promise<Prison[]> {
    const client = this.elite2ClientBuilder(token)
    const prisons = await client.getPrisons()
    return prisons.map(({ agencyId, description }) => ({ agencyId, description }))
  }

  private async createPrisonNameLookup(token: string): Promise<(agencyId: string) => string> {
    const prisons = await this.getPrisonsUsing(token)
    return (agencyId: string): string => {
      const found = prisons.find(prison => prison.agencyId === agencyId)
      return (found && found.description) || agencyId
    }
  }

  async search(searchingUserName: string, form: SearchForm): Promise<SearchResult[]> {
    if (!isFormComplete(form)) {
      return []
    }
    const token = await this.systemToken(searchingUserName)
    const client = new this.PrisonerSearchClient(token)
    const results = await client.search(form)
    const prisonNameLookup = await this.createPrisonNameLookup(token)

    return results.map(prisoner => ({
      name: properCaseFullName(`${prisoner.lastName}, ${prisoner.firstName}`),
      prisonNumber: prisoner.prisonerNumber,
      prison: prisonNameLookup(prisoner.prisonId),
      bookingId: prisoner.bookingId,
    }))
  }

  async getPrisons(username: string): Promise<Prison[]> {
    return this.getPrisonsUsing(await this.systemToken(username))
  }
}
