# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.
use Mix.Config

# Configures the endpoint
config :perf, Perf.Endpoint,
  url: [host: "localhost"],
  root: Path.dirname(__DIR__),
  secret_key_base: "aImzDiyBgxJO9ZbYDPoVQpVTKHgNxOakjRoo6pkEiuxLSZiRvsEV8zO5fu2K5bgP",
  render_errors: [accepts: ~w(html json)],
  pubsub: [name: Perf.PubSub,
           adapter: Phoenix.PubSub.PG2]

config :perf, ecto_repos: [Perf.Repo]
# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env}.exs"

# Configure phoenix generators
config :phoenix, :generators,
  migration: true,
  binary_id: false

config :guardian, Guardian,
  allowed_algos: ["HS512"], # optional
  verify_module: Guardian.JWT,  # optional
  issuer: "Perf",
  ttl: { 30, :days },
  verify_issuer: true, # optional
  secret_key: "boodles",
  serializer: Perf.GuardianSerializer,
  hooks: GuardianDb

config :guardian_db, GuardianDb,
       repo: Perf.Repo,
       schema_name: "tokens",
       sweep_interval: 60 * 24 * 30

config :perf, :yams,
  space: "/tmp"