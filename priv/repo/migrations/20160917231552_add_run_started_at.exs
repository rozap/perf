defmodule Perf.Repo.Migrations.AddRunStartedAt do
  use Ecto.Migration

  def change do
    alter table(:runs) do
      add :started_at, :datetime
    end
  end
end
