import React, { useEffect, useState } from 'react';
import { Form, Input, Grid } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import { TxButton } from './substrate-lib/components';
import { blake2AsHex } from '@polkadot/util-crypto';

function Main (props) {
  const { api } = useSubstrate();
  const { accountPair } = props;

  // The transaction submission status
  const [status, setStatus] = useState('');
  const [digest, setDigest] = useState('');
  const [owner, setOwner] = useState('');
  const [note, setNote] = useState('');
  const [blockNumber, setBlockNumber] = useState(0);
  const [receiver, setReceiver] = useState('');
  const [claimOwnerId, setClaimOwnerId] = useState('');
  const [claimList, setClaimList] = useState([]);

  useEffect(() => {
    let unsubscribe;
    api.query.poeModule.notes(digest, (result) => {
      setOwner(result[0].toString());
      setBlockNumber(result[1].toNumber());
    }).then(unsub => {
      unsubscribe = unsub;
    })
      .catch(console.error);

    return () => unsubscribe && unsubscribe();
  }, [digest, api.query.poeModule]);

  const handleFileChoose = (file) => {
    const fileReader = new FileReader();

    const bufferToDigest = () => {
      const content = Array.from(new Uint8Array(fileReader.result))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
  
        const hash = blake2AsHex(content, 256);
        setDigest(hash);
    }

    fileReader.onloadend = bufferToDigest;

    fileReader.readAsArrayBuffer(file);
  }

  const onReceiverChange = (_, data) => {
    setReceiver(data.value);
  }

  const convertToString = (hex) => {
    if (hex && hex.length) {
      return decodeURIComponent(hex.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&')).substr(2);
    }
    return '';
  };

  const getDocInfoFromAddr = async (claimOwnerId) => {
    const res = await api.query.poeModule.notes(claimOwnerId);
    const claims = res.map((item) => {
      console.log(item);
      return {
        docHash: blake2AsHex(item[0], 256),
        blockNumber: parseInt(item[1]),
        createdOn: new Date(parseInt(item[2])),
        comment: convertToString(item[3])
      };
    });
    setClaimList(JSON.stringify(claims));
  }

  return (
    <Grid.Column width={8}>
      <h1>Poe of Existence Module</h1>
      <Form>
        <Form.Field>
          <Input
            type='file'
            id='file'
            lable='Your File'
            onChange={ (e) => handleFileChoose(e.target.files[0]) }
          />
        </Form.Field>
        <Form.Field>
          <Input
            type='text'
            label='address'
            placeholder='Address'
            state='claimOwnerId'
            onChange={ (_, { value }) => setClaimOwnerId(value) }
          />
        </Form.Field>
        <Form.Field>
          <Input
            type='text'
            label='备注'
            placeholder='note'
            state='note'
            maxLength='256'
            onChange={ (_, { value }) => setNote(value) }
          />
        </Form.Field>

        <Form.Field>
          <TxButton
            accountPair={accountPair}
            label='Create Claim'
            setStatus={setStatus}
            type='SIGNED-TX'
            attrs={{
              palletRpc: 'poeModule',
              callable: 'createClaimWithNote',
              inputParams: [digest, note],
              paramFields: [true]
            }}
          />

          <TxButton
            accountPair={accountPair}
            label='Remove Claim'
            setStatus={setStatus}
            type='SIGNED-TX'
            attrs={{
              palletRpc: 'poeModule',
              callable: 'revokeClaim',
              inputParams: [digest],
              paramFields: [true]
            }}
          />

          <TxButton
            accountPair={accountPair}
            label='Transfer Claim'
            setStatus={setStatus}
            type='SIGNED-TX'
            attrs={{
              palletRpc: 'poeModule',
              callable: 'transferClaim',
              inputParams: [digest, receiver],
              paramFields: [true]
            }}
          />

          <button
            className={`ui blue basic button ${claimOwnerId ? '' : 'disabled'}`}
            disabled={!claimOwnerId}
            onClick={() => getDocInfoFromAddr(claimOwnerId)}>
            Query
          </button>
        </Form.Field>

          <div>
            {claimList}
          </div>
          <div>{status}</div>
          <div>{`Claim info, owner: ${owner}, blockNumber: ${blockNumber}, Note: ${note}`}</div>
      </Form>
    </Grid.Column>
  );
}

export default function PoeModule (props) {
  const { api } = useSubstrate();
  return (api.query.poeModule && api.query.poeModule.notes
    ? <Main {...props} /> : null);
}
