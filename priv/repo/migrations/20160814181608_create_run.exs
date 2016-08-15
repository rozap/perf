defmodule Perf.Repo.Migrations.CreateRun do
  use Ecto.Migration

  def change do
    create table(:runs) do
      add :suite, references(:suites, on_delete: :nothing)

      timestamps()
    end
    create index(:runs, [:suite])

  end
end
