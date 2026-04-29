'use client';

import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 */
export async function setDocument(docRef: DocumentReference, data: any, options?: SetOptions) {
  try {
    await setDoc(docRef, data, options || {});
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write', // or 'create'/'update' based on options
        requestResourceData: data,
      })
    );
    throw error;
  }
}


/**
 * Initiates an addDoc operation for a collection reference.
 */
export async function addDocument(colRef: CollectionReference, data: any) {
  try {
    const docRef = await addDoc(colRef, data);
    return docRef;
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      })
    );
    throw error;
  }
}


/**
 * Initiates an updateDoc operation for a document reference.
 */
export async function updateDocument(docRef: DocumentReference, data: any) {
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      })
    );
    throw error;
  }
}


/**
 * Initiates a deleteDoc operation for a document reference.
 */
export async function deleteDocument(docRef: DocumentReference) {
  try {
    await deleteDoc(docRef);
  } catch (error) {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      })
    );
    throw error;
  }
}
