import { faker } from '@faker-js/faker'
import { InsertManyResult, ObjectId } from 'mongodb'
import { CustomerDocument, CustomersCollection } from '../models/customer'

export function createFakeCustomer(): CustomerDocument {
    return {
        _id: new ObjectId(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        address: {
            line1: faker.location.streetAddress(),
            line2: faker.location.secondaryAddress(),
            postcode: faker.location.zipCode(),
            city: faker.location.city(),
            state: faker.location.state(),
            country: faker.location.country(),
        },
        createdAt: faker.date.anytime(),
    }
}

export async function createRandomCustomers(
    count: number
): Promise<InsertManyResult<CustomerDocument>> {
    const customers: CustomerDocument[] = faker.helpers.multiple(
        createFakeCustomer,
        { count }
    )

    return CustomersCollection.insertMany(customers)
}
