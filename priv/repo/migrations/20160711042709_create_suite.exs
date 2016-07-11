defmodule Perf.Repo.Migrations.CreateSuite do
  use Ecto.Migration

  def change do
    create table(:suites) do
      add :name, :string
      add :trigger, :map
      add :user_id, references(:users, on_delete: :nothing)

      timestamps()
    end
    create index(:suites, [:user_id])

  end
end
