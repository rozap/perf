defmodule Perf.Repo.Migrations.AddSuiteRequests do
  use Ecto.Migration

  def change do
    alter table(:suites) do
      add :requests, {:array, :map}
    end
  end
end
