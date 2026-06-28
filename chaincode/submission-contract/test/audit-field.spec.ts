import { expect } from 'chai';
import { Context } from 'fabric-contract-api';
import { SubmissionContract } from '../src/submission-contract';

describe('Submission audit fields', () => {
  it('persists invokedByX509 from clientIdentity.getID()', async () => {
    const putStateMock = {
      id: '',
      data: Buffer.from('')
    };

    const ctx = {
      clientIdentity: {
        getMSPID: () => 'UPPSMSP',
        getID: () => 'x509::CN=upps.john,OU=fabric::CN=ca.upps.akreditasi.local',
      },
      stub: {
        getState: async () => Buffer.from(''),
        putState: async (id: string, buf: any) => {
          putStateMock.id = id;
          putStateMock.data = buf;
          const stored = JSON.parse(buf.toString());
          expect(stored.invokedByX509).to.contain('CN=upps.john');
          expect(stored.updatedByX509).to.contain('CN=upps.john');
        },
        getTxTimestamp: () => ({ seconds: { toNumber: () => 1700000000 }, nanos: 0 }),
        setEvent: () => {},
      },
    } as unknown as Context;

    const contract = new SubmissionContract();
    await contract.CreateSubmission(
      ctx,
      'SUB-1',
      JSON.stringify({ programStudi: 'Teknik Informatika', institusi: 'UPPS Test', documents: [] })
    );

    expect(putStateMock.id).to.equal('SUB-1');
  });
});
