defmodule Perf.Mixfile do
  use Mix.Project

  def project do
    [app: :perf,
     version: "0.0.15",
     elixir: "~> 1.3",
     elixirc_paths: elixirc_paths(Mix.env),
     compilers: [:phoenix] ++ Mix.compilers,
     build_embedded: Mix.env == :prod,
     start_permanent: Mix.env == :prod,
     aliases: aliases,
     deps: deps]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [mod: {Perf, []},
     applications: [:phoenix, :phoenix_html, :cowboy, :logger,
                    :phoenix_ecto, :postgrex, :comeonin,
                    :exleveldb, :eleveldb, :poolboy, :httpoison,
                    :gen_stage, :guardian, :guardian_db,
                    :uuid, :phoenix_pubsub, :statistics,
                    :logger_file_backend, :yams]]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "web", "test/support"]
  defp elixirc_paths(_),     do: ["lib", "web"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [{:phoenix, "~> 1.2.0"},
     {:phoenix_ecto, "~> 3.0"},
     {:postgrex, ">= 0.0.0"},
     {:phoenix_html, "~> 2.1"},
     {:phoenix_live_reload, "~> 1.0", only: :dev},
     {:cowboy, "~> 1.0"},
     {:guardian, "~> 0.12.0"},
     {:guardian_db, "~> 0.7.0"},
     {:comeonin, "~> 2.5"},
     {:exleveldb, "~> 0.7.0"},
     {:uuid, "~> 1.1.4"},
     {:gen_stage, "~> 0.5.0"},
     {:poolboy, "~> 1.5"},
     {:httpoison, "~> 0.9.0"},
     {:statistics, "~> 0.4.1"},
     {:distillery, "~> 0.9"},
     {:logger_file_backend, "0.0.9"},
     {:yams, "~> 0.2.1"}
   ]
  end

  # Aliases are shortcut or tasks specific to the current project.
  # For example, to create, migrate and run the seeds file at once:
  #
  #     $ mix ecto.setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    ["ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
     "ecto.reset": ["ecto.drop", "ecto.setup"],
     "test": ["ecto.create --quiet", "ecto.migrate", "test"]
    ]
  end
end
