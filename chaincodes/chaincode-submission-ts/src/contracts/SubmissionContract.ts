import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Submission } from '../models/Submission';

@Info({ title: 'SubmissionContract', description: 'Smart Contract for managing accreditation submissions' })
export class SubmissionContract extends Contract {


    @Transaction()
    public async createSubmission(ctx: Context, submissionID: string, programID: string, universityID: string): Promise<void> {

    }


    @Transaction(false)
    @Returns('string')
    public async getSubmission(ctx: Context, submissionID: string): Promise<string> {
        const submissionJSON = await ctx.stub.getState(submissionID);
        if (!submissionJSON || submissionJSON.length === 0) {
            throw new Error(`The submission ${submissionID} does not exist`);
        }
        return submissionJSON.toString();
    }

    @Transaction()
    public async addDocument(ctx: Context, submissionID: string, docId: string, docHash: string): Promise<void> {
    }


    @Transaction()
    public async updateStatus(ctx: Context, submissionID: string, newStatus: string): Promise<void> {
    }

    @Transaction()
    public async put(ctx: Context, key: string, value: string): Promise<{ success: string }> {
        await ctx.stub.putState(key, Buffer.from(value));
        return { success: "OK" };
    }

    @Transaction(false)
    @Returns('string')
    public async queryWithQueryString(ctx: Context, queryString: string): Promise<string> {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push({ Key: result.value.key, Record: record });
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return JSON.stringify(results);
    }

    @Transaction(false)
    @Returns('string')
    public async getAllResults(ctx: Context, startKey: string, endKey: string): Promise<string> {
        const resultsIterator = await ctx.stub.getStateByRange(startKey, endKey);
        const results = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push({ Key: result.value.key, Record: record });
            result = await resultsIterator.next();
        }

        await resultsIterator.close();
        return JSON.stringify(results);
    }
}
