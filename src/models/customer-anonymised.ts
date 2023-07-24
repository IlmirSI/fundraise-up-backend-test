import { db } from '../lib/mongo'
import { CustomerDocument } from './customer'

export interface CustomersAnonymisedDocument extends CustomerDocument {}

export const CustomersAnonymisedRepository =
    db.collection<CustomersAnonymisedDocument>('customers_anonymised')
