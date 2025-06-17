import React from 'react';
import QuestCreator from '../../components/quest/QuestCreator';
import Head from 'next/head';

const CreateQuestPage = () => {
  return (
    <>
      <Head>
        <title>Create New Quest | OnQuest</title>
        <meta name="description" content="Create your new adventure quest" />
      </Head>
      <QuestCreator />
    </>
  );
};

export default CreateQuestPage;