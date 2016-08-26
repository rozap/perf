defmodule Perf.Repo.Migrations.CreateRequest do
  use Ecto.Migration

  def change do
    create table(:requests) do
      add :method, :string
      add :verified, :boolean
      add :path, :string
      add :params, :map
      add :body, :text
      add :headers, :map
      add :concurrency, :integer
      add :runlength, :integer
      add :timeout, :integer
      add :receive_timeout, :integer
      add :view, :map
      add :suite_id, references(:suites, on_delete: :nothing)

      timestamps()
    end
    create index(:requests, [:suite_id])
  end
end
