// eslint-disable-next-line import/prefer-default-export
export enum ECliResponses {
  Default = `
  No params provided. Use --help to find available commands`,
  Help = `
  ApiToaster\n
  Description: Tools for analyzing and storing api request\n
  Usage: npx api-toaster [COMMAND]\n
  Commands:\n
      time-travel:   Tests already received requests, by sending them again to your server
      decode:        Decode saved logs to readable json format
      find:          Find requests in logs
      migrate:       Migrate data from one format to the other.
      uni:           Unification of log files.
   `,
  TimeTravelUnknownCommand = `
  Available parameters for time-travel:
      --json, -j      'npx apiToaster find -j {"name": "jakob"}'
                      This will search for requests, which include those elements in body\n
      --ip, ip        'npx apiToaster find -ip 192.168.1.100'
                      Only supported, when storing client's ip is specified in middleware's config. By default for privacy reasons, its disabled.\n
      --keys, -k      'npx apiToaster find -k password city name'
                      This will search for requests, which include those keys in body. Usefull if your body has dynamic data\n
      --value, -v     'npx apiToaster find -v value1 value2 value3'
                      This will search for requests, which include those values in body.\n
      --method, -m    'npx apiToaster find -m POST'
                      This will search for requests with provided method.\n
      --code, -c      'npx apiToaster find -c 200'.
                      This will look for specific response statusCode in logs.`,
  TimeTravelHelp = `
  Time-Travel\n
  Description:  Allows your server to receive saved requests again. This command will read saved logs and send them in synchronous queue\n
  NOTE: This command requires your server to be running. Make sure that toaster config file exists or flag with server's port is provided.\n
  Usage: 'npx apiToaster time-travel [OPTIONS...]'.\n
      --json, -j      'npx apiToaster find -j {"name": "jakob"}'
                      This will search for requests, which include those elements in body\n
      --ip, ip        'npx apiToaster find -ip 192.168.1.100'
                      Only supported, when storing client's ip is specified in middleware's config. By default for privacy reasons, its disabled.\n
      --keys, -k      'npx apiToaster find -k password city name'
                      This will search for requests, which include those keys in body. Usefull if your body has dynamic data\n
      --value, -v     'npx apiToaster find -v value1 value2 value3'
                      This will search for requests, which include those values in body.\n
      --method, -m    'npx apiToaster find -m POST'
                      This will search for requests with provided method.\n
      --code, -c      'npx apiToaster find -c 200'.
                      This will look for specific response statusCode in logs.`,
  FindHelp = `
  Find\n
  Description:  Allows you to decode locally saved files to readable format ( json )\n
  NOTE: This command requires your server to be running. Make sure that toaster config file exists or flag with server's port is provided.\n
  Usage: 'npx api-toaster find [OPTIONS...]'.\n
      --file, -f      'npx api-toaster find -f file1'
                      (NOTE: in that case file1 must be in default dir, otherwise specify path, using --path option).
                      This will specify exact file to use for searching\n
      --path, -p      'npx api-toaster find -p path/to/dir'. 
                      Used to provide different path than one specified in State.config.path.\n
      --json, -j      'npx apiToaster find -j {"name": "jakob"}'.
                      This will search for requests, which include those elements in body.\n
      --ip, -ip       'npx apiToaster find -ip 192.168.1.100'.
                      Only supported, when storing client's ip is specified in middleware's config. By default for privacy reasons, its disabled.\n
      --keys, -k      'npx apiToaster find -k password city name'.
                      This will search for requests, which include those keys in body. Usefull if your body has dynamic data.\n
      --value, -v     'npx apiToaster find -v value1 value2 value3'.
                      This will search for requests, which include those values in body.\n
      --method, -m    'npx apiToaster find -m POST'.
                      This will search for requests with provided method.\n
      --code, -c      'npx apiToaster find -c 200'.
                      This will look for specific response statusCode in logs.`,
  FindUnknownCommand = `
  Available parameters for decode:
      --file, -f      'npx api-toaster find -f file1'
                      (NOTE: in that case file1 must be in default dir, otherwise specify path, using --path option).
                      This will specify exact file to use for searching\n
      --path, -p      'npx api-toaster find -p path/to/dir'. 
                      Used to provide different path than one specified in State.config.path.\n
      --json, -j      'npx apiToaster find -j {"name": "jakob"}'.
                      This will search for requests, which include those elements in body.\n
      --ip, -ip       'npx apiToaster find -ip 192.168.1.100'.
                      Only supported, when storing client's ip is specified in middleware's config. By default for privacy reasons, its disabled.\n
      --keys, -k      'npx apiToaster find -k password city name'.
                      This will search for requests, which include those keys in body. Usefull if your body has dynamic data.\n
      --value, -v     'npx apiToaster find -v value1 value2 value3'.
                      This will search for requests, which include those values in body.\n
      --method, -m    'npx apiToaster find -m POST'.
                      This will search for requests with provided method.\n
      --code, -c      'npx apiToaster find -c 200'.
                      This will look for specific response statusCode in logs.`,
  DecodeUnknownCommand = `
  Available parameters for decode:
      --save, -s  This provide filename to decode.`,
  DecodeHelp = `
  Decode\n
  Description: Used to decode log files into readable format.\n
  NOTE: By default, decode will decode only latest log file. You can change this behaviour, by providing files with --save option.\n
  Usage: 'npx api-toaster decode [OPTIONS....]'.\n
      --save, -s     'npx api-toaster decode -s log_1.json
                      This will decode and save given log file\n
      --path, -p      'npx api-toaster decode -p path/to/dir'. 
                      Used to provide different path than one specified in State.config.path`,
  MigrateHelp = `
  Migrate\n
  Discription: Used to migrate log files from one format to other.\n
  Usage: 'npx api-toaster migrate [OPTIONS....]'.\n
      --save, -s      'npx api-toaster migrate -s log_1.json -json'
                      This will create new file migrated_log_1.json.\n
      --path, -p      'npx api-toaster migrate -p path/to/dir'. 
                      Used to provide different path than one specified in State.config.path.\n
      -proto          'npx api-toaster migrate [ -p path/to/dir ] -proto'. 
                      Translate file into proto and save it.\n
      -json           'npx api-toaster migrate [ -p path/to/dir ] -json'.
                      Translate file into json and save it.`,
  MigrateUnknownCommand = `
  Available parameters for migrate:
      --save, -s      'npx api-toaster migrate -s log_1.json -json'
                      This will create new file migrated_log_1.json.\n
      --path, -p      'npx api-toaster migrate -p path/to/dir'. 
                      Used to provide different path than one specified in State.config.path.\n
      -proto          'npx api-toaster migrate [ -p path/to/dir ] -proto'. 
                      Translate file into proto and save it.\n
      -json           'npx api-toaster migrate [ -p path/to/dir ] -json'.
                      Translate file into json and save it.`,
  UnificateHelp = `
  Unification\n
  Descrition: Allows you to add some default values for missing\n
  fields in log files.\n
  NOTE: If for some reason user disabled some fields to be written in logs, or some fields were malformed,
  this command will add some empty/default values.\n
  Usage: 'npx api-toaster uni [OPTIONS...]'
      --save, -s      'npx api-toaster uni -s logs_0.json'
                      Provide filename to run command on. This command will add defaults to every possible missing field.\n
      --value, -v     'npx api-toaster uni [ -s logs_0.json ] -v ip method 
                      Provide one or more field name. This command will add defaults to ip and method.\n
      --remove, -rm   'npx api-toaster uni [ -s logs_0.json ] -rm [ -v ip method ]
                      Provide if one wants to remove some fields. This command will remove ip and method fields from logs.\n
  `,
  UnificationUnknownCommand = `
  Available parameters for unification:
      --save, -s      'npx api-toaster uni -s logs_0.json'
                      Provide filename to run command on. This command will add defaults to every possible missing field.\n
      --value, -v     'npx api-toaster uni [ -s logs_0.json ] -v ip method 
                      Provide one or more field name. This command will add defaults to ip and method.\n
      --remove, -rm   'npx api-toaster uni [ -s logs_0.json ] -rm [ -v ip method ]
                      Provide if one wants to remove some fields. This command will remove ip and method fields from logs.\n
  `,
}
