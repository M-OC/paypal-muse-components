/* @flow */
export type UserData = {|
  id? : string,
  email? : string,
  name? : string
|};

export type IdentityData = {|
    mrid : string,
    onIdentification : Function,
    onError? : Function
|};
