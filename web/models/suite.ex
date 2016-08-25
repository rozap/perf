defmodule Perf.Suite do
  use Perf.Web, :model

  defmodule Request do
    defstruct method: "GET",
      verified: false,
      path: "https://foo.com/bar/baz",
      params: [{"qux", 42}],
      body: :empty,
      headers: %{
        "Content-Type": "application/json"
      },
      concurrency: 20,
      runlength: 5,
      timeout: 500,
      receive_timeout: 500,
      view: %{}
  end

  schema "suites" do
    field :name, :string
    field :description, :string
    field :trigger, :map, default: %{}
    field :requests, {:array, :map}, default: []
    belongs_to :user, Perf.User

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :trigger, :user_id])
    |> validate_required([:name, :trigger, :user_id])
  end

  defimpl Poison.Encoder, for: Perf.Suite do
    @attributes ~W(id name description trigger requests belongs_to inserted_at updated_at)a

    def encode(suite, _options) do
      suite
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end
