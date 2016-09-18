defmodule Perf.Repo.Migrations.RampupRequest do
  use Ecto.Migration

  def change do
    alter table(:requests) do
      add :min_concurrency, :integer
      add :max_concurrency, :integer
      add :step_size, :integer
      add :step_duration, :integer

    end
  end
end
