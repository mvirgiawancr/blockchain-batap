import { Object, Property } from 'fabric-contract-api';
@Object()
export class AccreditationProof {


    @Property()
    public proofID!: string;

    @Property()
    public documentHash!: string;

    @Property()
    public ipfsCID!: string;

    @Property()
    public universityID!: string;

    @Property()
    public timestamp!: number;

    @Property()
    public decisionStatus!: string;
}

