export type StudioDraft = {
  prompt: string;
  mode: 'generate' | 'edit' | 'transparent';
  ratio: string;
  reference: string | null;
  savedAt: number;
};

function openDrafts(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('prism-studio-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStudioDraft(
  path: string,
  draft: Omit<StudioDraft, 'savedAt'>
) {
  const database = await openDrafts();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction
        .objectStore('drafts')
        .put({ ...draft, savedAt: Date.now() }, path);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function takeStudioDraft(
  path: string
): Promise<StudioDraft | null> {
  const database = await openDrafts();
  try {
    const draft = await new Promise<StudioDraft | undefined>(
      (resolve, reject) => {
        const transaction = database.transaction('drafts', 'readonly');
        const request = transaction.objectStore('drafts').get(path);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    );
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete(path);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    if (!draft || Date.now() - draft.savedAt > 2 * 60 * 60 * 1000) return null;
    if (
      !['generate', 'edit', 'transparent'].includes(draft.mode) ||
      !['1:1', '16:9', '9:16', '4:3', '3:4'].includes(draft.ratio) ||
      typeof draft.prompt !== 'string' ||
      draft.prompt.length > 2000
    )
      return null;
    return draft;
  } finally {
    database.close();
  }
}
