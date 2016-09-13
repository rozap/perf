* make min/max yams macros so expressions can be used
* figure out error surfacing
  * ssl errors
  * etc etc

producer -->
  * checkout N processes from Global pool
    * monitor each one
    * tell each one to execute request in a loop
      until X time
    * each request results in send to workex consumer
    * should all report back when they're done


