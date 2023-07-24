import { faker } from '@faker-js/faker'
import { CustomerDocument } from '../models/customer'
import { CustomersAnonymisedDocument } from '../models/customer-anonymised'

export const anonymizeCustomer = (
    customer: CustomerDocument
): CustomersAnonymisedDocument => {
    const [login, domain] = customer.email.split('@')
    return {
        ...customer,
        firstName: toDeterministicRandom(customer.firstName),
        lastName: toDeterministicRandom(customer.lastName),
        email: [toDeterministicRandom(login), domain].join('@'),
        address: {
            ...customer.address,
            line1: toDeterministicRandom(customer.address.line1),
            line2: toDeterministicRandom(customer.address.line2),
            postcode: toDeterministicRandom(customer.address.postcode),
        },
    }
}

export const toDeterministicRandom = (str: string) => {
    faker.seed(str.split('').map((c) => c.charCodeAt(0)))
    return faker.string.alphanumeric({ length: 8, casing: 'lower' })
}
