# Creary Tools
The JavaScript utilities for management Crea Blockchain Data

### Documentation

#### Install
```bash 
$ npm install -g creary-tools 
```

#### Create account
```bash
$ creary new-account creator wif user active posting memo owner json fee cgy
```

###### Parameters
- **creator**: Username of creator.
- **wif**: Key WIF Active from the creator.
- **user**: New username of the new account.
- **active**: Active PublicKey from the new account.
- **posting**: Posting PublicKey from the new account.
- **memo**: Memo PublicKey from the new account.
- **owner**: Owner PublicKey from the new account.
- **json**: JSON metadata (in string format) from the new account.
- **fee**: Fee to paid for account creation.
- **cgy**: Amount to Energize to new account. 

#### Store Comment data
```bash 
$ creary store-blocks host user password database block
```

###### Parameters
- **host**: MySQL Database host.
- **user**: MySQL Database user.
- **password**: MySQL Database user password.
- **database**: MySQL Database name.
- **block**: Number of the block by which to start.