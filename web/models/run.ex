defmodule Perf.Run.Status do
  use Ecto.Schema
  @primary_key {:id, :binary_id, autogenerate: true}
  schema "" do
    field :type, :string, default: "not_started"
    field :reason, :string, default: nil
    field :raw, :string, default: nil
  end

  def changeset(struct, params) do
    Ecto.Changeset.cast(struct, params, [:type, :reason, :raw])
  end

  def in_progress(old) do
    struct(old, type: "in_progress") |> Map.from_struct
  end

  def succeeded(old) do
    struct(old, type: "succeeded") |> Map.from_struct
  end

  def failed(old, reason, raw) do
    struct(old, type: "failed", reason: reason, raw: raw) |> Map.from_struct
  end


  defimpl Poison.Encoder, for: Perf.Run.Status do
    @attributes ~W(type reason raw)a

    def encode(run, _options) do
      run
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end


defmodule Perf.Run do
  use Perf.Web, :model
  alias Perf.Repo
  alias Perf.Run.Status
  alias Ecto.DateTime
  import Ecto.Changeset


  schema "runs" do
    belongs_to :suite, Perf.Suite
    field :yam_ref, :string
    field :started_at, Ecto.DateTime
    field :finished_at, Ecto.DateTime
    embeds_one :status, Status
    timestamps()
  end

  defp put_default(changeset, key, func) do
    if get_field(changeset, key, false) do
      changeset
    else
      func.(changeset)
    end
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:suite_id, :yam_ref, :started_at, :finished_at])
    |> cast_embed(:status)
    |> put_default(:yam_ref, fn cset -> put_change(cset, :yam_ref, UUID.uuid1) end)
    |> put_default(:status, fn cset -> put_embed(cset, :status, %Status{}) end)
    |> validate_required([:suite_id, :yam_ref, :status])
  end

  def write_start!(run) do
    Repo.update!(changeset(run, %{status: Status.in_progress(run.status), started_at: DateTime.utc}))
  end

  def write_failed!(run, reason, raw) do
    Repo.update!(changeset(run, %{status: Status.failed(run.status, reason, raw), finished_at: DateTime.utc}))
  end

  def write_succeeded!(run) do
    Repo.update!(changeset(run, %{status: Status.succeeded(run.status), finished_at: DateTime.utc}))
  end


  defimpl Poison.Encoder, for: Perf.Run do
    @attributes ~W(id inserted_at updated_at started_at finished_at suite yam_ref status)a

    def encode(run, _options) do

      duration = run.suite.requests
      |> Enum.reduce(0, fn req, acc -> 
        step_count = Float.ceil((req.max_concurrency - req.min_concurrency) / req.step_size)
        acc + ((req.step_duration + req.timeout + req.receive_timeout) * step_count)
      end)

      run
      |> Map.take(@attributes)
      |> Map.put(:duration, duration)
      |> Poison.encode!
    end
  end
end
