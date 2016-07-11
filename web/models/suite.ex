defmodule Perf.Suite do
  use Perf.Web, :model

  schema "suites" do
    field :name, :string
    field :trigger, :map
    belongs_to :user, Perf.User

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :trigger])
    |> validate_required([:name, :trigger, :user_id])
  end
end
