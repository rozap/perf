from fabric.api import *
from fabric.contrib.console import confirm
from fabric.colors import *
from os import listdir
from os.path import isdir, join
from distutils.version import StrictVersion
from sh import gcloud
import json


def list_instances():
    out = str(gcloud(['compute', 'instances', 'list', '--format', 'json']))
    return json.loads(out)


def hosts(kind):
    instances = list_instances()
    return [h['networkInterfaces'][0]['accessConfigs'][0]['natIP'] for h in instances]


env.use_ssh_config = True

#REMOTE
base_dir = "/var/sites/perf"
log_dir = "/var/log/perf"
media_dir = "/var/sites/perf_media"

#LOCAL
releases = "./rel/perf/releases"
archive_name = "perf.tar.gz"

def check_deploy():
    # local('mix clean')
    # local('mix test')
    local('mix ship')

def make_dirs(version):
    sudo("mkdir -p {base_dir}".format(base_dir = base_dir))
    sudo("mkdir -p {log_dir}".format(log_dir = log_dir))
    sudo("mkdir -p {media_dir}".format(media_dir = media_dir))
    sudo("mkdir -p {base_dir}/releases/{version}".format(
        base_dir = base_dir,
        version = version
    ))

    sudo("chown -R perf:perf {base_dir}".format(base_dir = base_dir))
    sudo("chown -R perf:perf {log_dir}".format(log_dir = log_dir))
    sudo("chown -R perf:perf {media_dir}".format(media_dir = media_dir))

def ensure_packages():
    # with hide('output'):
    with open('./deploy/deps.txt') as f:
        packages = ' '.join(f.read().split('\n'))
        sudo("apt-get update")
        sudo("apt-get install -y %s" % packages)

def build_release():
    print(green("Building release"))
    with shell_env(MIX_ENV='prod'):
        local('mix compile')
        local("gulp deploy")
        local("mix phoenix.digest")
        local("mix release")

        rels = [ StrictVersion(f) for f in listdir(releases) if isdir(join(releases,f)) ]
        release_dir = join(releases, str(max(rels)))
        return archive_name, join(release_dir, archive_name)

def ship(version):
    archive_name, archive = build_release()

    make_dirs(version)
    put(archive, "{base_dir}/releases/{version}".format(
        base_dir = base_dir,
        version = version
    ))

    with cd(base_dir):
        sudo("tar xfz {base_dir}/releases/{version}/{archive_name}".format(
            archive_name = archive_name,
            base_dir = base_dir,
            version = version
        ))
    put("deploy/upstart.conf", "/etc/init/perf.conf", use_sudo = True)

def migrate(version):
    artifact = 'perf-%s' % version
    print(cyan("""
        To migrate, run

            sudo {base_dir}/bin/perf

        And then in the console:

            Ecto.Migrator.run(Usic.Repo, "/var/sites/perf/lib/{artifact}/priv/repo/migrations", :up, all: true)
    """.format(
        base_dir = base_dir,
        artifact = artifact
    )))
    return prompt('Are your migrations in order?', default = 'no')

def upgrade(version):
    print(yellow("Upgrading to {version}".format(version = version)))
    with cd(base_dir):
        sudo("bin/perf upgrade {version}".format(version = version))

@task
def rollback(version):
    print(yellow("Downgrade to {version}".format(version = version)))
    with cd(base_dir):
        sudo("bin/perf downgrade {version}".format(version = version))


@task
def new(kind):
    print(green("making a new %s" % kind))
    gcloud(['compute', 'instances', 'create', 'phx'])

@task
def deploy(version):
    env.hosts = hosts('phx')
    check_deploy()
    print(green("starting deploy"))
    ensure_packages()
    ship(version)

    # res = migrate(version)

    # print "You said", res
    # if res == 'yes':
    #     upgrade(version)
    # else:
    #     print(red("Not upgrading until migrations are done"))
