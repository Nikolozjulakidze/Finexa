'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "../plaid";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { revalidatePath } from "next/cache";

const {
  APPWRITE_DATABASE_ID:DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID:USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID:BANK_COLLECTION_ID,
} = process.env; 

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

export const signUp = async ({password, ...userData}: SignUpParams) => {
  const { email, firstName, lastName } = userData; 

  let newUserAccount;

  try {
    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || !process.env.NEXT_PUBLIC_APPWRITE_PROJECT || !process.env.NEXT_APPWRITE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const { account,database } = await createAdminClient();

    // Create new user account
     newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    if(!newUserAccount) throw new Error('Error creating user')

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type:'personal'
    })

    if(!dwollaCustomerUrl) throw Error('Error creating dwolla customer')

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId:newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl
      }
    )

    // Create session for the new user
    const session = await account.createEmailPasswordSession(email, password);

    // Set session cookie
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
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

export const createLinkToken = async (user:User)=> {
  try {
    const tokenParams = {
      user:{
        client_user_id:user.$id
      },

      client_name:`${user.firstName} ${user.lastName}`,
      products:['auth'] as Products[],
      language: 'en',
      country_codes:['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({linkToken:response.data.link_token})
  } catch (error) {
    console.log(error);
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
} : createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
          userId,
          bankId,
          accountId,
          accessToken,
          fundingSourceUrl,
          shareableId,
      }
    )

    return parseStringify(bankAccount);
  } catch (error) {
    
  }
}

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {

  try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token:publicToken,
      });

      const accessToken = response.data.access_token;
      const itemId = response.data.item_id

      const accountsRespones = await plaidClient.accountsGet({
        access_token:accessToken,
      });

      const accountData = accountsRespones.data.accounts[0];

      const request:ProcessorTokenCreateRequest = {
        access_token:accessToken,
        account_id:accountData.account_id,
        processor:'dwolla' as ProcessorTokenCreateRequestProcessorEnum,
      };

      const processorTokenRespones = await plaidClient.processorTokenCreate(request);
      const processorToken = processorTokenRespones.data.processor_token;

      //create a funding source url for the account using the dwolla customer id,processor token and bank name
      const fundingSourceUrl = await addFundingSource({
        dwollaCustomerId:user.dwollaCustomerId,
        processorToken,
        bankName:accountData.name,
      });

      if(!fundingSourceUrl) throw Error;

      //create a bank account using the user id,item,id,acc id , access token,funding source url and sharable id

      await createBankAccount({
        userId:user.$id,
        bankId:itemId,
        accountId:accountData.account_id,
        accessToken,
        fundingSourceUrl,
        shareableId:encryptId(accountData.account_id)
      });

      revalidatePath('/');

      return parseStringify({
        publicTokenExchange:'complete',
      })
    
  } catch (error) {
    console.log(error)
  }
}