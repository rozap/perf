defmodule Perf.Repo.Migrations.AddRunStatus do
  use Ecto.Migration

  def change do
    alter table(:runs) do
      add :status, :map
    end
  end
end
