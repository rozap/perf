defmodule Perf.Suite do
  use Perf.Web, :model
  alias Perf.{Request, User}

  schema "suites" do
    field :name, :string
    field :description, :string
    field :trigger, :map, default: %{}
    has_many :requests, Request
    belongs_to :user, User

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :description, :trigger, :user_id])
    |> validate_required([:name, :trigger, :user_id])
  end

  defimpl Poison.Encoder, for: Perf.Suite do
    @attributes ~W(id name description trigger inserted_at updated_at requests)a

    def encode(suite, _options) do
      suite
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end
