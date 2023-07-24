import { Document, ObjectId, Collection } from 'mongodb'
import { db } from '../lib/mongo'

export interface CustomerCreation {
    firstName: string
    lastName: string
    email: string
    address: {
        line1: string
        line2: string
        postcode: string
        city: string
        state: string
        country: string
    }
    createdAt: Date
}

export interface CustomerDocument extends CustomerCreation, Document {
    _id: ObjectId
}

export const CustomersCollection = db.collection<CustomerDocument>('customers')
