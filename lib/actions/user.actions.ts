'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { extractCustomerIdFromUrl, parseStringify } from "../utils";

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    
    const response = await account.createEmailPasswordSession(email, password);


    return parseStringify(response);
  } catch (error) {
    console.error('Sign in error:', error);
    throw new Error('Failed to sign in. Please check your credentials.');
  }
}

export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstName, lastName } = userData; 

  try {
    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || !process.env.NEXT_PUBLIC_APPWRITE_PROJECT || !process.env.NEXT_APPWRITE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const { account } = await createAdminClient();

    // Create new user account
    const newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    // Create session for the new user
    const session = await account.createEmailPasswordSession(email, password);

    // Set session cookie
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUserAccount);
  } catch (error) {
    console.error("Signup error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('user_already_exists')) {
        throw new Error('An account with this email already exists.');
      } else if (error.message.includes('password')) {
        throw new Error('Password does not meet requirements.');
      } else if (error.message.includes('email')) {
        throw new Error('Please enter a valid email address.');
      }
    }
    
    throw new Error('Failed to create account. Please try again.');
  }
};

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    
    return parseStringify(user);
  } catch (error) {
    console.log('Get user error:', error);
    return null;
  }
}

export const logoutAccount = async () => {

  try {
    const { account } = await createSessionClient();

   cookies().delete("appwrite-session");

   await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}