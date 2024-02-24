'use client';
// @ts-ignore
import type { PutBlobResult } from '@vercel/blob';
import { useState, useRef } from 'react';
import Image from 'next/image';



export default function AvatarUploadPage( user: any) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  
    if (!inputFileRef.current?.files) {
      throw new Error("No file selected");
    }
  
    const file = inputFileRef.current.files[0];
  
    const response = await fetch(
      `/api/avatar/upload?filename=${file.name}`,
      {
        method: 'POST',
        body: file,
      },
    );
  
    const newBlob = (await response.json()) as PutBlobResult;
  
    setBlob(newBlob);
  };
  return (
    <>
      <h1>Upload Your Avatar</h1>

      <form onSubmit={handleSubmit}>
        <input name="file" ref={inputFileRef} type="file" required />
        <button type="submit">Upload</button>
      </form>
      {blob && (
        <div>
          <Image src={blob.url} alt="Uploaded avatar" width={500} height={500} />
        </div>
      )}
    </>
  );
}