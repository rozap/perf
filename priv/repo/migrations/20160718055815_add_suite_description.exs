defmodule Perf.Repo.Migrations.AddSuiteDescription do
  use Ecto.Migration

  def change do
    alter table(:suites) do
      add :description, :string
    end
  end
end
