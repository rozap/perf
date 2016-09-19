{application,guardian_db,
             [{registered,[]},
              {description,"DB tracking for token validity"},
              {vsn,"0.7.0"},
              {modules,['Elixir.GuardianDb',
                        'Elixir.GuardianDb.ExpiredSweeper',
                        'Elixir.GuardianDb.Token']},
              {applications,[kernel,stdlib,elixir,logger]}]}.